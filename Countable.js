/**
 * Countable is a script to allow for live paragraph-, word- and character-
 * counting on an HTML element. Usage is recommended on `input` and `textarea`
 * elements.
 *
 * @author   Sacha Schmid (<https://github.com/RadLikeWhoa>)
 * @version  2.0.0
 * @license  MIT
 * @see      <http://radlikewhoa.github.io/Countable/>
 */

;(function (global) {
  'use strict'

  /**
   * Countable needs querySelectorAll to work properly. If it's not supported,
   * no functionality is added.
   */

  if (!document.querySelectorAll) return

  /**
   * @private
   *
   * `_liveElements` holds all elements that have the live-counting
   * functionality bound to them.
   *
   * `_event` holds the event to handle the live counting, based on the
   * browser's capabilities.
   */

  var _liveElements = [],
      _event = 'oninput' in document ? 'input' : 'keyup'

  /**
   * `String.trim()` polyfill for non-supporting browsers. This is the
   * recommended polyfill on MDN.
   *
   * @see     <http://goo.gl/uYveB>
   * @see     <http://goo.gl/xjIxJ>
   *
   * @return  {String}  The original string with leading and trailing whitespace
   *                    removed.
   */

  if (!String.prototype.trim) {
    String.prototype.trim = function () {
      return this.replace(/^\s+|\s+$/g, '')
    }
  }

  /**
   * `ucs2decode` function from the punycode.js library.
   *
   * Creates an array containing the decimal code points of each Unicode
   * character in the string. While JavaScript uses UCS-2 internally, this
   * function will convert a pair of surrogate halves (each of which UCS-2
   * exposes as separate characters) into a single code point, matching
   * UTF-16.
   *
   * @see     <http://goo.gl/8M09r>
   * @see     <http://goo.gl/u4UUC>
   *
   * @param   {String}  string   The Unicode input string (UCS-2).
   *
   * @return  {Array}   The new array of code points.
   */

  function _decode (string) {
    var output = [],
        counter = 0,
        length = string.length,
        value, extra

    while (counter < length) {
      value = string.charCodeAt(counter++)

      if ((value & 0xF800) == 0xD800 && counter < length) {

        // High surrogate, and there is a next character.

        extra = string.charCodeAt(counter++)

        if ((extra & 0xFC00) == 0xDC00) {

          // Low surrogate.

          output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000)
        } else {
          output.push(value, extra)
        }
      } else {
        output.push(value)
      }
    }

    return output
  }

  /**
   * `_validateArguments` validates the arguments given to each function call.
   * Errors are logged to the console as warnings, but Countable fails silently.
   *
   * @private
   *
   * @param   {String}            selector  The selector to validate.
   *
   * @param   {NodeList/Element}  elements  The (collection of) element(s) to
   *                                        validate.
   *
   * @param   {Function}          callback  The callback function to validate.
   *
   * @return  {Boolean}           Returns whether all arguments are vaild.
   */

  function _validateArguments (selector, elements, callback) {
    var selectorValid = typeof selector === 'string',
        elementsValid = elements && elements.length,
        callbackValid = callback && typeof callback === 'function'

    if ('console' in window && 'warn' in console) {
      if (!selectorValid) {
        console.warn('Countable: "' + selector + '" is not a valid selector')
      } else if (!elementsValid) {
        console.warn('Countable: No elements were found for the selector "' + selector + '"')
      }

      if (!callbackValid) {
        console.warn('Countable: ' + callback + ' is not a valid callback function')
      }
    }

    return selectorValid && elementsValid && callbackValid
  }

  /**
   * `_extendDefaults` is a function to extend a set of default options with the
   * ones given in the function call.
   *
   * @private
   *
   * @param   {Object}  options  Countable accepts the following options. They
   *                             can be used in a function call to override the
   *                             default behaviour.
   *                             `hardReturns`: Use two returns to seperate a
   *                             paragraph instead of one.
   *                             `stripTags`: Strip HTML tags before counting
   *                             the values.
   *
   * @return  {Object}  The new options object.
   */

  function _extendDefaults (options) {
    var defaults = { hardReturns: false, stripTags: false }

    for (var prop in options) {
      if (defaults.hasOwnProperty(prop)) defaults[prop] = options[prop]
    }

    return defaults
  }

  /**
   * `_count` trims an element's value, optionally strips HTML tags and counts
   * paragraphs, words, characters and characters plus spaces.
   *
   * @private
   *
   * @param   {Element}  element  The element whose value is to be counted.
   *
   * @param   {Object}   options  The options to use for the counting.
   *
   * @return  {Object}   The object containing the number of paragraphs,
   *                     words, characters and characters plus spaces.
   */

  function _count (element, options) {
    var original = 'value' in element ? element.value : element.innerText || element.textContent,
        temp, trimmed

    /**
     * If the option to strip tags from the text is set, create a temporary
     * element that receives the value from the Countable element. The original
     * value is then replaced with the stripped value from the temporary
     * element.
     */

    if (options.stripTags) original = original.replace(/<\/?[a-z][^>]*>/gi, '')

    trimmed = original.trim()

    /**
     * Most of the performance improvements are based on the works of @epmatsw.
     *
     * @see <http://goo.gl/SWOLB>
     */

    return {
      paragraphs: trimmed ? (trimmed.match(options.hardReturns ? /\n{2,}/g : /\n+/g) || []).length + 1 : 0,
      words: trimmed ? (trimmed.replace(/['";:,.?¿\-!¡]+/g, '').match(/\S+/g) || []).length : 0,
      characters: trimmed ? _decode(trimmed.replace(/\s/g, '')).length : 0,
      all: _decode(original.replace(/[\n\r]/g, '')).length
    }
  }

  /**
   * `_query` is a shorthand function to get all elements matching a given
   * selector.
   *
   * @private
   *
   * @param   {String}    selector  A valid CSS selector is required.
   *
   * @return  {NodeList}  The NodeList containing all matching elements.
   */

  function _query (selector) {
    selector = typeof selector === 'string' ? selector : '☺'
    return document.querySelectorAll(selector)
  }

  /**
   * `_loop` is a helper function to iterate over a collection, e.g. a NodeList
   * or an array. The callback receives the current element.
   *
   * @private
   *
   * @param  {Array}     which     The collection to iterate over.
   *
   * @param  {Function}  callback  The callback function to call on each
   *                               iteration.
   */

  function _loop (which, callback) {
    var len = which.length

    while (len--) {
      callback(which[len])
    }
  }

  /**
   * This is the main object that will later be exposed to other scripts. It
   * holds all the public methods that can be used to enable the Countable
   * functionality.
   */

  var Countable = {

    /**
     * The `live` method binds the counting handler to all elements that match
     * a selector. The event is `oninput` or `onkeydown`, based on the
     * capabilities of the browser.
     *
     * @param   {String}    selector   The selector to get all elements that
     *                                 should receive the Countable
     *                                 functionality.
     *
     * @param   {Function}  callback   The callback to fire whenever the
     *                                 elements value changes. The callback is
     *                                 called with the element bound to `this`
     *                                 and the counted values as the single
     *                                 parameter.
     *
     * @param   {Object}    [options]  An object to modify Countable's
     *                                 behaviour. Refer to `_extendDefaults`
     *                                 for a list of available options.
     *
     * @return  {Object}    Returns the Countable object to allow for chaining.
     */

    live: function (selector, callback, options) {
      var elements = _query(selector),
          ops = _extendDefaults(options),
          bind = function (element) {
            var handler = function () {
                  callback.call(element, _count(element, ops))
                }

            _liveElements.push({ element: element, handler: handler })

            handler()

            if (element.addEventListener) {
              element.addEventListener(_event, handler, false)
            } else if (element.attachEvent) {
              element.attachEvent('on' + _event, handler)
            }
          }

      if (!_validateArguments(selector, elements, callback)) return

      _loop(elements, bind)

      return this
    },

    /**
     * The `die` method removes the Countable functionality from all elements
     * matching the given selector.
     *
     * @param   {String}  selector   The selector to get all elements that
     *                               should receive the Countable
     *                               functionality.
     *
     * @return  {Object}  Returns the Countable object to allow for chaining.
     */

    die: function (selector) {
      var elements = _query(selector)

      if (!_validateArguments(selector, elements, function () {})) return

      _loop(elements, function (element) {
        var liveElement

        _loop(_liveElements, function (live) {
          if (live.element === element) liveElement = live
        })

        if (!liveElement) return

        if (element.removeEventListener) {
          element.removeEventListener(_event, liveElement.handler, false)
        } else if (element.detachEvent) {
          element.detachEvent('on' + _event, liveElement.handler)
        }

        _liveElements.splice(_liveElements.indexOf(liveElement), 1)
      })

      return this
    },

    /**
     * The `once` method works mostly like the `live` method, but no events are
     * bound, the functionality is only executed once.
     *
     * @param   {String}    selector   The selector to get all elements that
     *                                 should receive the Countable
     *                                 functionality.
     *
     * @param   {Function}  callback   The callback to fire whenever the
     *                                 elements value changes. The callback is
     *                                 called with the element bound to `this`
     *                                 and the counted values as the single
     *                                 parameter.
     *
     * @param   {Object}    [options]  An object to modify Countable's
     *                                 behaviour. Refer to `_extendDefaults`
     *                                 for a list of available options.
     *
     * @return  {Object}    Returns the Countable object to allow for chaining.
     */

    once: function (selector, callback, options) {
      var elements = _query(selector)

      if (!_validateArguments(selector, elements, callback)) return

      _loop(elements, function (element) {
        callback.call(element, _count(element, _extendDefaults(options)))
      })

      return this
    },

    /**
     * The `enabled` method checks if the live-counting functionality is bound
     * to an element.
     *
     * @param   {Element}  element  A single Element.
     *
     * @return  {Boolean}  A boolean value representing whether Countable
     *                     functionality is bound to the given element.
     */

    enabled: function (element) {
      var isEnabled = false

      if (element && element.nodeType === 1) {
        _loop(_liveElements, function (live) {
          if (live.element === element) isEnabled = true
        })
      }

      return isEnabled
    }

  }

  /**
   * Expose Countable depending on the module system used across the
   * application. (Node / CommonJS, AMD, global)
   */

  if (typeof exports === 'object') {
    module.exports = Countable
  } else if (typeof define === 'function' && define.amd) {
    define(function () { return Countable })
  } else {
    global.Countable = Countable
  }
}(this))