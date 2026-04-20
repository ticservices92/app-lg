angular.module('patternParser', []).factory('patternParser', [function() {
    var T = {
        Literal: 1,     // Literal text to insert
        Field: 2,       // ej @{firstName} (in turnero) or @client.firstName (in text widget)
        Then: 3,        // > (piping operator)
        Or: 4,          // || (fallback operator)
        Opts: 5,        // @opts{key: val}
        Lparen: 6,      // (
        Rparen: 7,      // )
        Semicolon: 8,   // ;
        Illegal: 9,
        Eof: 10,        // End
    };

    // Ideas de funciones a agregar: split, arrindex, join, regex.match, toUppercase/toLowercase/toTitlecase
    var runtimeFns = {
        slice: function(str, start, end) {
            return str.slice(start, end);
        },
    };

    /**
    * @param {string} input
    */
    function getLexer(input) {
        var currPos = 0;
        var RESERVED_CHARS = ['@', '|', '>', '(', ')', ';', '\\'];
        return {
            next: function() {
                if (currPos >= input.length) return this.eof();
                switch (input[currPos]) {
                    case '@':
                        currPos++;
                        if (this.match('['))
                            return this.literal('@['); // Leave url tags unchanged, will be replaced in text widget
                        else if (this.match('{'))
                            return this.fieldToken('@{', '}');
                        else if (this.match('opts{'))
                            return this.opts();
                        else
                            return this.fieldToken('@', '');
                        break;
                    case '>':
                        return this.func();
                    case '|':
                        return this.newToken(T.Or, undefined, currPos, ++currPos);
                    case '(':
                        return this.newToken(T.Lparen, undefined, currPos, ++currPos);
                    case ')':
                        return this.newToken(T.Rparen, undefined, currPos, ++currPos);
                    case ';':
                        return this.newToken(T.Semicolon, undefined, currPos, ++currPos);
                    case '\\':
                        var startPos = currPos;
                        currPos++;
                        for (var i in RESERVED_CHARS) {
                            var char = RESERVED_CHARS[i];
                            if (this.match(char))
                                return this.newToken(T.Literal, char, startPos, currPos);
                        }
                        return this.illegal('Invalid escaped token ' + input[currPos], startPos, startPos+1);
                    default:
                        return this.literal('');
                }
            },
            fieldToken: function(startPattern, endPattern) {
                var startPos = currPos - startPattern.length;
                var fieldRegex = /[\w\.-]/;
                var raw = this.takeWhile(function(curr) { return fieldRegex.test(curr); });
                // Strip trailing dots for undelimited @field syntax so sentence punctuation
                // after a variable (e.g. @client.queueUp.customerLastName.) is not consumed
                // as part of the field path, which would create an empty key and resolve to ''.
                if (endPattern === '') {
                    while (raw.length > 0 && raw[raw.length - 1] === '.') {
                        raw = raw.slice(0, -1);
                        currPos--;
                    }
                }
                var field_arr = raw.split('.');
                if (!this.match(endPattern)) return this.illegal('Unclosed field literal', startPos, currPos);
                return this.newToken(T.Field, field_arr, startPos, currPos);
            },
            opts: function() {
                var startPos = currPos - '@opts{'.length;
                var opts = '{' + this.takeWhile(function(curr) { return curr != '}'; }) + '}';
                if (!this.match('}')) return this.illegal('Unclosed opts literal', startPos, currPos);
                return this.newToken(T.Opts, JSON.parse(opts), startPos, currPos);
            },
            func: function() {
                var startPos = currPos;
                currPos++; // >
                var name = this.takeWhile(function(curr) { return curr !== '('; });
                currPos++; // (
                var args = this.takeWhile(function(curr) { return curr !== ')'; })
                    .split(/, */g)
                    .map(function(arg) {
                        return parseInt(arg);
                    });
                if (!this.match(')')) return this.illegal('Unclosed function call', startPos, currPos);

                return this.newToken(T.Then, { name: name, args: args }, startPos, currPos);
            },
            literal: function(start) {
                var startPos = currPos;
                var lit = this.takeWhile(function(curr) { return !RESERVED_CHARS.includes(curr); });
                return this.newToken(T.Literal, start + lit, startPos, currPos);
            },
            takeWhile: function(cond) {
                var acc = '';
                while (currPos < input.length && cond(input[currPos], acc)) {
                    acc += input[currPos];
                    currPos++;
                }
                return acc;
            },
            newToken: function(type, data, startPos, endPos) {
                return {
                    type: type,
                    data: data,
                    startPos: startPos,
                    endPos: endPos,
                };
            },
            eof: function() {
                return this.newToken(T.Eof, undefined, currPos, currPos);
            },
            illegal: function(mes, start, end) {
                return this.newToken(T.Illegal, mes, start, end);
            },
            match: function(str) {
                var res = input.indexOf(str, currPos) === currPos;
                if (res) {
                    currPos += str.length;
                }
                return res;
            },
        };
    }

    /**
    * @param {string} input
    */
    function compiler(input) {
        var tokens = getLexer(input);
        var peeked = tokens.next();
        function peek() {
            return peeked;
        }
        function next() {
            var res = peeked;
            peeked = tokens.next();
            return res;
        }
        var res = [];

        return {
            compile: function(compileOpts) {
                var opts = { earlyEscape: (compileOpts && compileOpts.earlyEscape !== undefined) ? compileOpts.earlyEscape : true };
                while (peek().type !== T.Eof)
                    res.push(this.parseColumn(opts));
                return res;
            },
            parseColumn: function(opts) {
                var res = this.parseExpr(opts);
                var t = next(); // Consume Semicolon or Eof
                if (t.type === T.Rparen) return this.unexpectedToken(t);
                return res;
            },
            parseExpr: function(opts) {
                // TODO: since grammar is so simple, I didn't need to force precedence/associativity to get the desired result
                // If this grows more complex, it should be added (check out Pratt Parsing)
                var acc;
                while (1) {
                    switch (peek().type) {
                        case T.Literal:
                            acc = this.concat(acc, this.literal(next().data), opts);
                            break;
                        case T.Field:
                            acc = this.concat(acc, this.field(next().data), opts);
                            break;
                        case T.Then:
                            var then_token = next();
                            acc = this.applyFn(acc, then_token.data.name, then_token.data.args, opts);
                            break;
                        case T.Or:
                            next();
                            var rhs = this.parseExpr(opts);
                            acc = this.fallback(acc, rhs, opts);
                            break;
                        case T.Opts:
                            this.opts(next().data, opts);
                            break;

                        case T.Lparen:
                            next();
                            acc = this.concat(acc, this.parseExpr(opts), opts);
                            this.consume(T.Rparen);
                            break;

                        case T.Semicolon:
                        case T.Eof:
                        case T.Rparen:
                            return acc || function() { };

                        case T.Illegal:
                            return this.unexpectedToken(next());

                        default: throw 'Parse error: Unknown token ' + JSON.stringify(peek());
                    }
                }
            },
            consume: function(type) {
                var t = next();
                if (t.type !== type) return this.unexpectedToken(t, type);
                return t;
            },
            concat: function(lhs, rhs, opts) {
                if (!lhs) return rhs;
                return function(turn) {
                    var v1 = lhs(turn), v2 = rhs(turn);
                    if (opts.earlyEscape && (!v1 || !v2))
                        return '';
                    return v1 + v2;
                };
            },
            literal: function(lit, _opts) {
                return function(_turn) {
                    return lit;
                };
            },
            field: function(field_arr, _opts) {
                return function(turn) {
                    return field_arr.reduce(function (prev, field) {
                        return prev[field] || '';
                    }, turn).toString();
                };
            },
            applyFn: function(lhs, funcName, funcArgs, _opts) {
                if (!runtimeFns.hasOwnProperty(funcName))
                    throw "Parse error: unknown function " + funcName;
                return function(turn) {
                    var v = lhs(turn);
                    var newArgs = funcArgs.slice();
                    newArgs.unshift(v);
                    return runtimeFns[funcName].apply(undefined, newArgs);
                };
            },
            opts: function(newOpts, opts) {
                SecureMerge.mergeDeep(opts, newOpts);
            },
            fallback: function(lhs, rhs, _opts) {
                return function(turn) {
                    var v = lhs(turn);
                    if ((typeof v === "string" && v.trim()) || (typeof v !== "string" && v))
                        return v;
                    return rhs(turn);
                };
            },
            unexpectedToken: function(t, expected) {
                throw ("Parse error: Unexpected token at position " + t.startPos +
                    " (near " + input.substring(t.startPos - 1, t.endPos + 5) + ")\n" +
                    "Token: " + JSON.stringify(t)) +
                    (expected ? ('\n' + 'Expected: ' + expected) : '') +
                    '\nInput was:\n' + input;
            },
        };
    }

    /**
    * @param {string} input
    * @returns {Function}
    */
    function compile(input, compileOpts) {
        var colsFns = compiler(input).compile(compileOpts);
        return function(turn) {
            return colsFns.map(function(col) {
                return turn ? col(turn) : '-';
            });
        };
    }



    /* test-code
    <!-- build:remove:webkit,android,lg,tizen,samsung,web,webDebug -->
    */
    function testLexer() {
        var inputs = [
            '@{myField}@opts{}',
            '@{lastName}, @{firstName}|(@{dni}>substr(1, 2))',
            '\\(@client.firstName\\)',
        ];
        var outputs = [
            [
                { type: T.Field, data: ['myField'], startPos: 0, endPos: 10 },
                { type: T.Opts, data: {}, startPos: 10, endPos: 17 },
            ],
            [
                { type: T.Field, data: ['lastName'], startPos: 0, endPos: 11 },
                { type: T.Literal, data: ', ', startPos: 11, endPos: 13 },
                { type: T.Field, data: ['firstName'], startPos: 13, endPos: 25 },
                { type: T.Or, data: undefined, startPos: 25, endPos: 26 },
                { type: T.Lparen, data: undefined, startPos: 26, endPos: 27 },
                { type: T.Field, data: ['dni'], startPos: 27, endPos: 33 },
                { type: T.Then, data: { name: 'substr', args: [1, 2] }, startPos: 33, endPos: 46 },
                { type: T.Rparen, data: undefined, startPos: 46, endPos: 47 },
            ],
            [
                { type: T.Literal, data: '(', startPos: 0, endPos: 2 },
                { type: T.Field, data: ['client', 'firstName'], startPos: 2, endPos: 19 },
                { type: T.Literal, data: ')', startPos: 19, endPos: 21 },
            ],
        ];
        for (var i in inputs) {
            if (!inputs.hasOwnProperty(i)) continue;

            var input = inputs[i];
            var expected = outputs[i];
            var tokens = getLexer(input);
            var res = [];
            try {
                var t = tokens.next();
                for (var j = 0; j < 10 && t && t.type != T.Eof; j++) {
                    res.push(t);
                    t = tokens.next();
                }
            } catch (e) {
                console.error('Test ' + i + ' failed with', e)
            }
            if (!angular.equals(res, expected)) {
                console.error('Test error. Got', res, 'expected', expected, '(test ' + i + ')');
            }
        }
        console.log("Lexer tests ran");
    }

    function testCompiler() {
        var turn = { firstName: 'Edsger', lastName: 'Dijkstra', dni: 12345678, nested: { firstName: 'Donald', lastName: 'Knuth' } };
        var inputs = [
            '@{lastName}, @{firstName};@{dni}',
            'ASD-@{nonExistentField}|DNI-@{dni}',
            'DNI-(@{dni}>slice(2, 5))',
            'DNI-(@{dni}>slice(-3))',
            '(@{nonExistentField}, @{nonExistentField2}|DNI-@{dni}>slice(2,5))|@{firstName};@{lastName}>slice(1)',
            '@opts{"earlyEscape": false}(asd@{nonExistentField}, @{nonExistentField2}|DNI-@{dni}>slice(2,5))|@{firstName};@{lastName}>slice(1)',
            '@{lastName}|-;@{dni}',
            'test @{nested.lastName};@nested.firstName test',
            '(@nested.asdf|@nested.firstName>slice(3))',
        ];
        var outputs = [
            ['Dijkstra, Edsger', '12345678'],
            ['DNI-12345678'],
            ['DNI-345'],
            ['DNI-678'],
            ['I-1', 'ijkstra'],
            ['asd, ', 'ijkstra'],
            ['Dijkstra', '12345678'],
            ['test Knuth', 'Donald test'],
            ['ald'],
        ];
        for (var i in inputs) {
            if (!inputs.hasOwnProperty(i)) continue;

            var input = inputs[i];
            var expected = outputs[i];
            try {
                var pattern = compile(input);
                var res = pattern(turn);
                if (!angular.equals(expected, res)) {
                    console.error('Test error. Got', res, 'expected', expected, '(test ' + i + ')');
                    continue;
                }
                res = pattern(turn);
                if (!angular.equals(expected, res)) {
                    console.error('Test error. Failed idempotence test. Got', res, 'expected', expected, '(test ' + i + ')');
                }
            } catch (e){
                console.error('Test ' + i + ' failed with', e)
            }
        }
        console.log("Parser tests ran");
    }

    testLexer();
    testCompiler();
    /* end-test-code
    <!-- /build -->
     */

    return {
        compile: compile,
    };
}]);
