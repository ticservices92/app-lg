/**
 * SecureMerge - Secure object merging utility with prototype pollution protection
 *
 * This module provides secure alternatives to jQuery.extend() and angular.extend()
 * that protect against prototype pollution attacks by blocking dangerous properties
 * (__proto__, constructor, prototype).
 *
 * Security fix for CVE-390 - Prototype Pollution Vulnerability
 *
 * @module SecureMerge
 *
 * IMPORTANT: This code is ES5-compatible for Chrome 38+ support
 * - No const, let, arrow functions, template strings, etc.
 * - Compatible with AngularJS 1.4.8 and NW.js 0.38.4
 */

(function(window) {
    'use strict';

    /**
     * Properties that are dangerous and should never be merged
     * @const {Array<string>}
     */
    var DANGEROUS_PROPS = ['__proto__', 'constructor', 'prototype'];

    /**
     * Check if a property name is dangerous and should be blocked
     * @param {string} key - Property name to check
     * @returns {boolean} True if property is dangerous
     */
    function isDangerousProperty(key) {
        return DANGEROUS_PROPS.indexOf(key) !== -1;
    }

    /**
     * Safe hasOwnProperty check that works even if the object has a hasOwnProperty property
     * @param {Object} obj - Object to check
     * @param {string} key - Property name
     * @returns {boolean} True if object has own property
     */
    function hasOwnProperty(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    /**
     * Check if a value is a plain object (not Array, Date, RegExp, etc.)
     * @param {*} obj - Value to check
     * @returns {boolean} True if value is a plain object
     */
    function isPlainObject(obj) {
        // Not an object or is null
        if (typeof obj !== 'object' || obj === null) {
            return false;
        }

        // Check if it's a plain object (not Array, Date, etc.)
        if (Object.prototype.toString.call(obj) !== '[object Object]') {
            return false;
        }

        // Check prototype chain
        var proto = Object.getPrototypeOf(obj);

        // Object.create(null) has no prototype
        if (proto === null) {
            return true;
        }

        // Check if constructor is Object
        var Ctor = hasOwnProperty(proto, 'constructor') && proto.constructor;
        return typeof Ctor === 'function' && Ctor === Object;
    }

    /**
     * Secure deep merge - recursively merges nested objects
     * Protects against prototype pollution at all nesting levels
     *
     * @param {Object} target - Target object (will be modified)
     * @param {...Object} sources - Source objects to merge from
     * @returns {Object} The modified target object
     * @throws {TypeError} If target is null or undefined
     *
     * @example
     * Example A
     * var target = {config: {a: 1}};
     * var source = {config: {b: 2}};
     * SecureMerge.mergeDeep(target, source);
     * // target is now {config: {a: 1, b: 2}}
     *
     * Example B
     * var target = {a: 1};
     * var source = {b: 2};
     * SecureMerge.mergeDeep(target, source);
     * // target is now {a: 1, b: 2}
     */
    function secureMergeDeep(target /* , ...sources */) {
        // Validate target
        if (target == null) {
            target = {};
        }

        // Convert to object
        var to = Object(target);

        // Get all source arguments (skip first argument which is target)
        var sources = Array.prototype.slice.call(arguments, 1);

        // Iterate through all sources
        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];

            // Skip null/undefined sources
            if (source == null) {
                continue;
            }

            // Copy properties from source to target
            for (var key in source) {
                // Only copy own properties, not inherited ones
                // Block dangerous properties
                if (!hasOwnProperty(source, key) || isDangerousProperty(key)) {
                    continue;
                }

                var sourceValue = source[key];

                // Deep merge for plain objects only
                if (isPlainObject(sourceValue)) {
                    var targetValue = to[key];

                    if (isPlainObject(targetValue)) {
                        // Both are plain objects - recursive merge
                        to[key] = secureMergeDeep({}, targetValue, sourceValue);
                    } else {
                        // Target is not a plain object - create new merged object
                        to[key] = secureMergeDeep({}, sourceValue);
                    }
                } else {
                    // Not a plain object (Array, Date, primitive, etc.) - copy by reference
                    to[key] = sourceValue;
                }
            }
        }

        return to;
    }

    /**
     * Validate object for dangerous properties before merging
     * Useful for validating external data (server responses, user input)
     *
     * @param {*} obj - Object to validate
     * @returns {boolean} True if object is safe to merge
     *
     * @example
     * if (SecureMerge.isSafe(serverResponse)) {
     *     SecureMerge.mergeDeep(config, serverResponse);
     * }
     */
    function isSafe(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return true; // Primitives are safe
        }

        // Check for dangerous properties
        for (var i = 0; i < DANGEROUS_PROPS.length; i++) {
            if (DANGEROUS_PROPS[i] in obj) {
                return false;
            }
        }

        return true;
    }

    // Create the SecureMerge API object
    var SecureMergeUtils = {
        mergeDeep: secureMergeDeep,
        isSafe: isSafe,
    };

    // Expose as AngularJS service if AngularJS is available
    if (typeof window.debPlayerWeb !== 'undefined' && window.debPlayerWeb.factory) {
        window.debPlayerWeb.factory('SecureMerge', function() {
            return SecureMergeUtils;
        });
    }

    // Also expose globally for non-Angular code and lib/ utilities
    window.SecureMerge = SecureMergeUtils;

})(window);
