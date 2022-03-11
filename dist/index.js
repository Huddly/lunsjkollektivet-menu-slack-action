module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete installedModules[moduleId];
/******/ 		}
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(822);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 57:
/***/ (function(module) {

"use strict";


module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};


/***/ }),

/***/ 62:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);
var transformData = __webpack_require__(812);
var isCancel = __webpack_require__(57);
var defaults = __webpack_require__(190);
var Cancel = __webpack_require__(875);

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new Cancel('canceled');
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData.call(
      config,
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};


/***/ }),

/***/ 65:
/***/ (function(module) {

"use strict";


module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};


/***/ }),

/***/ 70:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var createError = __webpack_require__(226);

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};


/***/ }),

/***/ 87:
/***/ (function(module) {

module.exports = require("os");

/***/ }),

/***/ 104:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);
var settle = __webpack_require__(70);
var buildFullPath = __webpack_require__(934);
var buildURL = __webpack_require__(646);
var http = __webpack_require__(605);
var https = __webpack_require__(211);
var httpFollow = __webpack_require__(707).http;
var httpsFollow = __webpack_require__(707).https;
var url = __webpack_require__(835);
var zlib = __webpack_require__(761);
var VERSION = __webpack_require__(322).version;
var createError = __webpack_require__(226);
var enhanceError = __webpack_require__(516);
var defaults = __webpack_require__(190);
var Cancel = __webpack_require__(875);

var isHttps = /https:?/;

/**
 *
 * @param {http.ClientRequestArgs} options
 * @param {AxiosProxyConfig} proxy
 * @param {string} location
 */
function setProxy(options, proxy, location) {
  options.hostname = proxy.host;
  options.host = proxy.host;
  options.port = proxy.port;
  options.path = location;

  // Basic proxy authorization
  if (proxy.auth) {
    var base64 = Buffer.from(proxy.auth.username + ':' + proxy.auth.password, 'utf8').toString('base64');
    options.headers['Proxy-Authorization'] = 'Basic ' + base64;
  }

  // If a proxy is used, any redirects must also pass through the proxy
  options.beforeRedirect = function beforeRedirect(redirection) {
    redirection.headers.host = redirection.host;
    setProxy(redirection, proxy, redirection.href);
  };
}

/*eslint consistent-return:0*/
module.exports = function httpAdapter(config) {
  return new Promise(function dispatchHttpRequest(resolvePromise, rejectPromise) {
    var onCanceled;
    function done() {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled);
      }

      if (config.signal) {
        config.signal.removeEventListener('abort', onCanceled);
      }
    }
    var resolve = function resolve(value) {
      done();
      resolvePromise(value);
    };
    var reject = function reject(value) {
      done();
      rejectPromise(value);
    };
    var data = config.data;
    var headers = config.headers;
    var headerNames = {};

    Object.keys(headers).forEach(function storeLowerName(name) {
      headerNames[name.toLowerCase()] = name;
    });

    // Set User-Agent (required by some servers)
    // See https://github.com/axios/axios/issues/69
    if ('user-agent' in headerNames) {
      // User-Agent is specified; handle case where no UA header is desired
      if (!headers[headerNames['user-agent']]) {
        delete headers[headerNames['user-agent']];
      }
      // Otherwise, use specified value
    } else {
      // Only set header if it hasn't been set in config
      headers['User-Agent'] = 'axios/' + VERSION;
    }

    if (data && !utils.isStream(data)) {
      if (Buffer.isBuffer(data)) {
        // Nothing to do...
      } else if (utils.isArrayBuffer(data)) {
        data = Buffer.from(new Uint8Array(data));
      } else if (utils.isString(data)) {
        data = Buffer.from(data, 'utf-8');
      } else {
        return reject(createError(
          'Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream',
          config
        ));
      }

      // Add Content-Length header if data exists
      if (!headerNames['content-length']) {
        headers['Content-Length'] = data.length;
      }
    }

    // HTTP basic authentication
    var auth = undefined;
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      auth = username + ':' + password;
    }

    // Parse url
    var fullPath = buildFullPath(config.baseURL, config.url);
    var parsed = url.parse(fullPath);
    var protocol = parsed.protocol || 'http:';

    if (!auth && parsed.auth) {
      var urlAuth = parsed.auth.split(':');
      var urlUsername = urlAuth[0] || '';
      var urlPassword = urlAuth[1] || '';
      auth = urlUsername + ':' + urlPassword;
    }

    if (auth && headerNames.authorization) {
      delete headers[headerNames.authorization];
    }

    var isHttpsRequest = isHttps.test(protocol);
    var agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;

    var options = {
      path: buildURL(parsed.path, config.params, config.paramsSerializer).replace(/^\?/, ''),
      method: config.method.toUpperCase(),
      headers: headers,
      agent: agent,
      agents: { http: config.httpAgent, https: config.httpsAgent },
      auth: auth
    };

    if (config.socketPath) {
      options.socketPath = config.socketPath;
    } else {
      options.hostname = parsed.hostname;
      options.port = parsed.port;
    }

    var proxy = config.proxy;
    if (!proxy && proxy !== false) {
      var proxyEnv = protocol.slice(0, -1) + '_proxy';
      var proxyUrl = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()];
      if (proxyUrl) {
        var parsedProxyUrl = url.parse(proxyUrl);
        var noProxyEnv = process.env.no_proxy || process.env.NO_PROXY;
        var shouldProxy = true;

        if (noProxyEnv) {
          var noProxy = noProxyEnv.split(',').map(function trim(s) {
            return s.trim();
          });

          shouldProxy = !noProxy.some(function proxyMatch(proxyElement) {
            if (!proxyElement) {
              return false;
            }
            if (proxyElement === '*') {
              return true;
            }
            if (proxyElement[0] === '.' &&
                parsed.hostname.substr(parsed.hostname.length - proxyElement.length) === proxyElement) {
              return true;
            }

            return parsed.hostname === proxyElement;
          });
        }

        if (shouldProxy) {
          proxy = {
            host: parsedProxyUrl.hostname,
            port: parsedProxyUrl.port,
            protocol: parsedProxyUrl.protocol
          };

          if (parsedProxyUrl.auth) {
            var proxyUrlAuth = parsedProxyUrl.auth.split(':');
            proxy.auth = {
              username: proxyUrlAuth[0],
              password: proxyUrlAuth[1]
            };
          }
        }
      }
    }

    if (proxy) {
      options.headers.host = parsed.hostname + (parsed.port ? ':' + parsed.port : '');
      setProxy(options, proxy, protocol + '//' + parsed.hostname + (parsed.port ? ':' + parsed.port : '') + options.path);
    }

    var transport;
    var isHttpsProxy = isHttpsRequest && (proxy ? isHttps.test(proxy.protocol) : true);
    if (config.transport) {
      transport = config.transport;
    } else if (config.maxRedirects === 0) {
      transport = isHttpsProxy ? https : http;
    } else {
      if (config.maxRedirects) {
        options.maxRedirects = config.maxRedirects;
      }
      transport = isHttpsProxy ? httpsFollow : httpFollow;
    }

    if (config.maxBodyLength > -1) {
      options.maxBodyLength = config.maxBodyLength;
    }

    if (config.insecureHTTPParser) {
      options.insecureHTTPParser = config.insecureHTTPParser;
    }

    // Create the request
    var req = transport.request(options, function handleResponse(res) {
      if (req.aborted) return;

      // uncompress the response body transparently if required
      var stream = res;

      // return the last request in case of redirects
      var lastRequest = res.req || req;


      // if no content, is HEAD request or decompress disabled we should not decompress
      if (res.statusCode !== 204 && lastRequest.method !== 'HEAD' && config.decompress !== false) {
        switch (res.headers['content-encoding']) {
        /*eslint default-case:0*/
        case 'gzip':
        case 'compress':
        case 'deflate':
        // add the unzipper to the body stream processing pipeline
          stream = stream.pipe(zlib.createUnzip());

          // remove the content-encoding in order to not confuse downstream operations
          delete res.headers['content-encoding'];
          break;
        }
      }

      var response = {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: res.headers,
        config: config,
        request: lastRequest
      };

      if (config.responseType === 'stream') {
        response.data = stream;
        settle(resolve, reject, response);
      } else {
        var responseBuffer = [];
        var totalResponseBytes = 0;
        stream.on('data', function handleStreamData(chunk) {
          responseBuffer.push(chunk);
          totalResponseBytes += chunk.length;

          // make sure the content length is not over the maxContentLength if specified
          if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
            stream.destroy();
            reject(createError('maxContentLength size of ' + config.maxContentLength + ' exceeded',
              config, null, lastRequest));
          }
        });

        stream.on('error', function handleStreamError(err) {
          if (req.aborted) return;
          reject(enhanceError(err, config, null, lastRequest));
        });

        stream.on('end', function handleStreamEnd() {
          var responseData = Buffer.concat(responseBuffer);
          if (config.responseType !== 'arraybuffer') {
            responseData = responseData.toString(config.responseEncoding);
            if (!config.responseEncoding || config.responseEncoding === 'utf8') {
              responseData = utils.stripBOM(responseData);
            }
          }

          response.data = responseData;
          settle(resolve, reject, response);
        });
      }
    });

    // Handle errors
    req.on('error', function handleRequestError(err) {
      if (req.aborted && err.code !== 'ERR_FR_TOO_MANY_REDIRECTS') return;
      reject(enhanceError(err, config, null, req));
    });

    // Handle request timeout
    if (config.timeout) {
      // This is forcing a int timeout to avoid problems if the `req` interface doesn't handle other types.
      var timeout = parseInt(config.timeout, 10);

      if (isNaN(timeout)) {
        reject(createError(
          'error trying to parse `config.timeout` to int',
          config,
          'ERR_PARSE_TIMEOUT',
          req
        ));

        return;
      }

      // Sometime, the response will be very slow, and does not respond, the connect event will be block by event loop system.
      // And timer callback will be fired, and abort() will be invoked before connection, then get "socket hang up" and code ECONNRESET.
      // At this time, if we have a large number of request, nodejs will hang up some socket on background. and the number will up and up.
      // And then these socket which be hang up will devoring CPU little by little.
      // ClientRequest.setTimeout will be fired on the specify milliseconds, and can make sure that abort() will be fired after connect.
      req.setTimeout(timeout, function handleRequestTimeout() {
        req.abort();
        var transitional = config.transitional || defaults.transitional;
        reject(createError(
          'timeout of ' + timeout + 'ms exceeded',
          config,
          transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
          req
        ));
      });
    }

    if (config.cancelToken || config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = function(cancel) {
        if (req.aborted) return;

        req.abort();
        reject(!cancel || (cancel && cancel.type) ? new Cancel('canceled') : cancel);
      };

      config.cancelToken && config.cancelToken.subscribe(onCanceled);
      if (config.signal) {
        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
      }
    }


    // Send the request
    if (utils.isStream(data)) {
      data.on('error', function handleStreamError(err) {
        reject(enhanceError(err, config, null, req));
      }).pipe(req);
    } else {
      req.end(data);
    }
  });
};


/***/ }),

/***/ 117:
/***/ (function(module, __unusedexports, __webpack_require__) {

const fetch = __webpack_require__(467);
const { translateString } = __webpack_require__(279);
const { getNextBusinessDay, stripEndingNewlineBreaks } = __webpack_require__(918);

/**
 * Get todays menu from Lunsjkollektivet
 *
 * @returns {Promise<array>}
 */
async function getLunsjkollektivetMenu() {
	const { date } = getNextBusinessDay();
	const source = `https://api.lunsjkollektivet.no/menus?startDate=${date}&endDate=${date}`;
	const res = await fetch(source);

	if (!res.ok) {
		throw new Error(`Could not fetch menu: ${res.statusText}`);
	}

	const json = await res.json();
	const menu = await Promise.all(
		json.map(async ({ type, meal }) => {
			const menuType = await translateString(type.name);
			const menuDescription = await translateString(stripEndingNewlineBreaks(meal.description));

			return {
				type: menuType,
				description: menuDescription,
			};
		})
	);

	// Sort menu alphabetically by menu.type
	menu.sort((a, b) => a.type.localeCompare(b.type));

	return menu;
}

module.exports = { getLunsjkollektivetMenu };


/***/ }),

/***/ 124:
/***/ (function(__unusedmodule, exports) {

//[4]   	NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
//[4a]   	NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
//[5]   	Name	   ::=   	NameStartChar (NameChar)*
var nameStartChar = /[A-Z_a-z\xC0-\xD6\xD8-\xF6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]///\u10000-\uEFFFF
var nameChar = new RegExp("[\\-\\.0-9"+nameStartChar.source.slice(1,-1)+"\\u00B7\\u0300-\\u036F\\u203F-\\u2040]");
var tagNamePattern = new RegExp('^'+nameStartChar.source+nameChar.source+'*(?:\:'+nameStartChar.source+nameChar.source+'*)?$');
//var tagNamePattern = /^[a-zA-Z_][\w\-\.]*(?:\:[a-zA-Z_][\w\-\.]*)?$/
//var handlers = 'resolveEntity,getExternalSubset,characters,endDocument,endElement,endPrefixMapping,ignorableWhitespace,processingInstruction,setDocumentLocator,skippedEntity,startDocument,startElement,startPrefixMapping,notationDecl,unparsedEntityDecl,error,fatalError,warning,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,comment,endCDATA,endDTD,endEntity,startCDATA,startDTD,startEntity'.split(',')

//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
var S_TAG = 0;//tag name offerring
var S_ATTR = 1;//attr name offerring 
var S_ATTR_SPACE=2;//attr name end and space offer
var S_EQ = 3;//=space?
var S_ATTR_NOQUOT_VALUE = 4;//attr value(no quot value only)
var S_ATTR_END = 5;//attr value end and no space(quot end)
var S_TAG_SPACE = 6;//(attr value end || tag end ) && (space offer)
var S_TAG_CLOSE = 7;//closed el<el />

/**
 * Creates an error that will not be caught by XMLReader aka the SAX parser.
 *
 * @param {string} message
 * @param {any?} locator Optional, can provide details about the location in the source
 * @constructor
 */
function ParseError(message, locator) {
	this.message = message
	this.locator = locator
	if(Error.captureStackTrace) Error.captureStackTrace(this, ParseError);
}
ParseError.prototype = new Error();
ParseError.prototype.name = ParseError.name

function XMLReader(){
	
}

XMLReader.prototype = {
	parse:function(source,defaultNSMap,entityMap){
		var domBuilder = this.domBuilder;
		domBuilder.startDocument();
		_copy(defaultNSMap ,defaultNSMap = {})
		parse(source,defaultNSMap,entityMap,
				domBuilder,this.errorHandler);
		domBuilder.endDocument();
	}
}
function parse(source,defaultNSMapCopy,entityMap,domBuilder,errorHandler){
	function fixedFromCharCode(code) {
		// String.prototype.fromCharCode does not supports
		// > 2 bytes unicode chars directly
		if (code > 0xffff) {
			code -= 0x10000;
			var surrogate1 = 0xd800 + (code >> 10)
				, surrogate2 = 0xdc00 + (code & 0x3ff);

			return String.fromCharCode(surrogate1, surrogate2);
		} else {
			return String.fromCharCode(code);
		}
	}
	function entityReplacer(a){
		var k = a.slice(1,-1);
		if(k in entityMap){
			return entityMap[k]; 
		}else if(k.charAt(0) === '#'){
			return fixedFromCharCode(parseInt(k.substr(1).replace('x','0x')))
		}else{
			errorHandler.error('entity not found:'+a);
			return a;
		}
	}
	function appendText(end){//has some bugs
		if(end>start){
			var xt = source.substring(start,end).replace(/&#?\w+;/g,entityReplacer);
			locator&&position(start);
			domBuilder.characters(xt,0,end-start);
			start = end
		}
	}
	function position(p,m){
		while(p>=lineEnd && (m = linePattern.exec(source))){
			lineStart = m.index;
			lineEnd = lineStart + m[0].length;
			locator.lineNumber++;
			//console.log('line++:',locator,startPos,endPos)
		}
		locator.columnNumber = p-lineStart+1;
	}
	var lineStart = 0;
	var lineEnd = 0;
	var linePattern = /.*(?:\r\n?|\n)|.*$/g
	var locator = domBuilder.locator;
	
	var parseStack = [{currentNSMap:defaultNSMapCopy}]
	var closeMap = {};
	var start = 0;
	while(true){
		try{
			var tagStart = source.indexOf('<',start);
			if(tagStart<0){
				if(!source.substr(start).match(/^\s*$/)){
					var doc = domBuilder.doc;
	    			var text = doc.createTextNode(source.substr(start));
	    			doc.appendChild(text);
	    			domBuilder.currentElement = text;
				}
				return;
			}
			if(tagStart>start){
				appendText(tagStart);
			}
			switch(source.charAt(tagStart+1)){
			case '/':
				var end = source.indexOf('>',tagStart+3);
				var tagName = source.substring(tagStart+2,end);
				var config = parseStack.pop();
				if(end<0){
					
	        		tagName = source.substring(tagStart+2).replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' is not complete:'+config.tagName);
	        		end = tagStart+1+tagName.length;
	        	}else if(tagName.match(/\s</)){
	        		tagName = tagName.replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' maybe not complete');
	        		end = tagStart+1+tagName.length;
				}
				var localNSMap = config.localNSMap;
				var endMatch = config.tagName == tagName;
				var endIgnoreCaseMach = endMatch || config.tagName&&config.tagName.toLowerCase() == tagName.toLowerCase()
		        if(endIgnoreCaseMach){
		        	domBuilder.endElement(config.uri,config.localName,tagName);
					if(localNSMap){
						for(var prefix in localNSMap){
							domBuilder.endPrefixMapping(prefix) ;
						}
					}
					if(!endMatch){
		            	errorHandler.fatalError("end tag name: "+tagName+' is not match the current start tagName:'+config.tagName ); // No known test case
					}
		        }else{
		        	parseStack.push(config)
		        }
				
				end++;
				break;
				// end elment
			case '?':// <?...?>
				locator&&position(tagStart);
				end = parseInstruction(source,tagStart,domBuilder);
				break;
			case '!':// <!doctype,<![CDATA,<!--
				locator&&position(tagStart);
				end = parseDCC(source,tagStart,domBuilder,errorHandler);
				break;
			default:
				locator&&position(tagStart);
				var el = new ElementAttributes();
				var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
				//elStartEnd
				var end = parseElementStartPart(source,tagStart,el,currentNSMap,entityReplacer,errorHandler);
				var len = el.length;
				
				
				if(!el.closed && fixSelfClosed(source,end,el.tagName,closeMap)){
					el.closed = true;
					if(!entityMap.nbsp){
						errorHandler.warning('unclosed xml attribute');
					}
				}
				if(locator && len){
					var locator2 = copyLocator(locator,{});
					//try{//attribute position fixed
					for(var i = 0;i<len;i++){
						var a = el[i];
						position(a.offset);
						a.locator = copyLocator(locator,{});
					}
					domBuilder.locator = locator2
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el)
					}
					domBuilder.locator = locator;
				}else{
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el)
					}
				}
				
				
				
				if(el.uri === 'http://www.w3.org/1999/xhtml' && !el.closed){
					end = parseHtmlSpecialContent(source,end,el.tagName,entityReplacer,domBuilder)
				}else{
					end++;
				}
			}
		}catch(e){
			if (e instanceof ParseError) {
				throw e;
			}
			errorHandler.error('element parse error: '+e)
			end = -1;
		}
		if(end>start){
			start = end;
		}else{
			//TODO: 这里有可能sax回退，有位置错误风险
			appendText(Math.max(tagStart,start)+1);
		}
	}
}
function copyLocator(f,t){
	t.lineNumber = f.lineNumber;
	t.columnNumber = f.columnNumber;
	return t;
}

/**
 * @see #appendElement(source,elStartEnd,el,selfClosed,entityReplacer,domBuilder,parseStack);
 * @return end of the elementStartPart(end of elementEndPart for selfClosed el)
 */
function parseElementStartPart(source,start,el,currentNSMap,entityReplacer,errorHandler){

	/**
	 * @param {string} qname
	 * @param {string} value
	 * @param {number} startIndex
	 */
	function addAttribute(qname, value, startIndex) {
		if (qname in el.attributeNames) errorHandler.fatalError('Attribute ' + qname + ' redefined')
		el.addValue(qname, value, startIndex)
	}
	var attrName;
	var value;
	var p = ++start;
	var s = S_TAG;//status
	while(true){
		var c = source.charAt(p);
		switch(c){
		case '=':
			if(s === S_ATTR){//attrName
				attrName = source.slice(start,p);
				s = S_EQ;
			}else if(s === S_ATTR_SPACE){
				s = S_EQ;
			}else{
				//fatalError: equal must after attrName or space after attrName
				throw new Error('attribute equal must after attrName'); // No known test case
			}
			break;
		case '\'':
		case '"':
			if(s === S_EQ || s === S_ATTR //|| s == S_ATTR_SPACE
				){//equal
				if(s === S_ATTR){
					errorHandler.warning('attribute value must after "="')
					attrName = source.slice(start,p)
				}
				start = p+1;
				p = source.indexOf(c,start)
				if(p>0){
					value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					addAttribute(attrName, value, start-1);
					s = S_ATTR_END;
				}else{
					//fatalError: no end quot match
					throw new Error('attribute value no end \''+c+'\' match');
				}
			}else if(s == S_ATTR_NOQUOT_VALUE){
				value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
				//console.log(attrName,value,start,p)
				addAttribute(attrName, value, start);
				//console.dir(el)
				errorHandler.warning('attribute "'+attrName+'" missed start quot('+c+')!!');
				start = p+1;
				s = S_ATTR_END
			}else{
				//fatalError: no equal before
				throw new Error('attribute value must after "="'); // No known test case
			}
			break;
		case '/':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				s =S_TAG_CLOSE;
				el.closed = true;
			case S_ATTR_NOQUOT_VALUE:
			case S_ATTR:
			case S_ATTR_SPACE:
				break;
			//case S_EQ:
			default:
				throw new Error("attribute invalid close char('/')") // No known test case
			}
			break;
		case ''://end document
			errorHandler.error('unexpected end of input');
			if(s == S_TAG){
				el.setTagName(source.slice(start,p));
			}
			return p;
		case '>':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				break;//normal
			case S_ATTR_NOQUOT_VALUE://Compatible state
			case S_ATTR:
				value = source.slice(start,p);
				if(value.slice(-1) === '/'){
					el.closed  = true;
					value = value.slice(0,-1)
				}
			case S_ATTR_SPACE:
				if(s === S_ATTR_SPACE){
					value = attrName;
				}
				if(s == S_ATTR_NOQUOT_VALUE){
					errorHandler.warning('attribute "'+value+'" missed quot(")!');
					addAttribute(attrName, value.replace(/&#?\w+;/g,entityReplacer), start)
				}else{
					if(currentNSMap[''] !== 'http://www.w3.org/1999/xhtml' || !value.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+value+'" missed value!! "'+value+'" instead!!')
					}
					addAttribute(value, value, start)
				}
				break;
			case S_EQ:
				throw new Error('attribute value missed!!');
			}
//			console.log(tagName,tagNamePattern,tagNamePattern.test(tagName))
			return p;
		/*xml space '\x20' | #x9 | #xD | #xA; */
		case '\u0080':
			c = ' ';
		default:
			if(c<= ' '){//space
				switch(s){
				case S_TAG:
					el.setTagName(source.slice(start,p));//tagName
					s = S_TAG_SPACE;
					break;
				case S_ATTR:
					attrName = source.slice(start,p)
					s = S_ATTR_SPACE;
					break;
				case S_ATTR_NOQUOT_VALUE:
					var value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					addAttribute(attrName, value, start)
				case S_ATTR_END:
					s = S_TAG_SPACE;
					break;
				//case S_TAG_SPACE:
				//case S_EQ:
				//case S_ATTR_SPACE:
				//	void();break;
				//case S_TAG_CLOSE:
					//ignore warning
				}
			}else{//not space
//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
				switch(s){
				//case S_TAG:void();break;
				//case S_ATTR:void();break;
				//case S_ATTR_NOQUOT_VALUE:void();break;
				case S_ATTR_SPACE:
					var tagName =  el.tagName;
					if(currentNSMap[''] !== 'http://www.w3.org/1999/xhtml' || !attrName.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+attrName+'" missed value!! "'+attrName+'" instead2!!')
					}
					addAttribute(attrName, attrName, start);
					start = p;
					s = S_ATTR;
					break;
				case S_ATTR_END:
					errorHandler.warning('attribute space is required"'+attrName+'"!!')
				case S_TAG_SPACE:
					s = S_ATTR;
					start = p;
					break;
				case S_EQ:
					s = S_ATTR_NOQUOT_VALUE;
					start = p;
					break;
				case S_TAG_CLOSE:
					throw new Error("elements closed character '/' and '>' must be connected to");
				}
			}
		}//end outer switch
		//console.log('p++',p)
		p++;
	}
}
/**
 * @return true if has new namespace define
 */
function appendElement(el,domBuilder,currentNSMap){
	var tagName = el.tagName;
	var localNSMap = null;
	//var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
	var i = el.length;
	while(i--){
		var a = el[i];
		var qName = a.qName;
		var value = a.value;
		var nsp = qName.indexOf(':');
		if(nsp>0){
			var prefix = a.prefix = qName.slice(0,nsp);
			var localName = qName.slice(nsp+1);
			var nsPrefix = prefix === 'xmlns' && localName
		}else{
			localName = qName;
			prefix = null
			nsPrefix = qName === 'xmlns' && ''
		}
		//can not set prefix,because prefix !== ''
		a.localName = localName ;
		//prefix == null for no ns prefix attribute 
		if(nsPrefix !== false){//hack!!
			if(localNSMap == null){
				localNSMap = {}
				//console.log(currentNSMap,0)
				_copy(currentNSMap,currentNSMap={})
				//console.log(currentNSMap,1)
			}
			currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
			a.uri = 'http://www.w3.org/2000/xmlns/'
			domBuilder.startPrefixMapping(nsPrefix, value) 
		}
	}
	var i = el.length;
	while(i--){
		a = el[i];
		var prefix = a.prefix;
		if(prefix){//no prefix attribute has no namespace
			if(prefix === 'xml'){
				a.uri = 'http://www.w3.org/XML/1998/namespace';
			}if(prefix !== 'xmlns'){
				a.uri = currentNSMap[prefix || '']
				
				//{console.log('###'+a.qName,domBuilder.locator.systemId+'',currentNSMap,a.uri)}
			}
		}
	}
	var nsp = tagName.indexOf(':');
	if(nsp>0){
		prefix = el.prefix = tagName.slice(0,nsp);
		localName = el.localName = tagName.slice(nsp+1);
	}else{
		prefix = null;//important!!
		localName = el.localName = tagName;
	}
	//no prefix element has default namespace
	var ns = el.uri = currentNSMap[prefix || ''];
	domBuilder.startElement(ns,localName,tagName,el);
	//endPrefixMapping and startPrefixMapping have not any help for dom builder
	//localNSMap = null
	if(el.closed){
		domBuilder.endElement(ns,localName,tagName);
		if(localNSMap){
			for(prefix in localNSMap){
				domBuilder.endPrefixMapping(prefix) 
			}
		}
	}else{
		el.currentNSMap = currentNSMap;
		el.localNSMap = localNSMap;
		//parseStack.push(el);
		return true;
	}
}
function parseHtmlSpecialContent(source,elStartEnd,tagName,entityReplacer,domBuilder){
	if(/^(?:script|textarea)$/i.test(tagName)){
		var elEndStart =  source.indexOf('</'+tagName+'>',elStartEnd);
		var text = source.substring(elStartEnd+1,elEndStart);
		if(/[&<]/.test(text)){
			if(/^script$/i.test(tagName)){
				//if(!/\]\]>/.test(text)){
					//lexHandler.startCDATA();
					domBuilder.characters(text,0,text.length);
					//lexHandler.endCDATA();
					return elEndStart;
				//}
			}//}else{//text area
				text = text.replace(/&#?\w+;/g,entityReplacer);
				domBuilder.characters(text,0,text.length);
				return elEndStart;
			//}
			
		}
	}
	return elStartEnd+1;
}
function fixSelfClosed(source,elStartEnd,tagName,closeMap){
	//if(tagName in closeMap){
	var pos = closeMap[tagName];
	if(pos == null){
		//console.log(tagName)
		pos =  source.lastIndexOf('</'+tagName+'>')
		if(pos<elStartEnd){//忘记闭合
			pos = source.lastIndexOf('</'+tagName)
		}
		closeMap[tagName] =pos
	}
	return pos<elStartEnd;
	//} 
}
function _copy(source,target){
	for(var n in source){target[n] = source[n]}
}
function parseDCC(source,start,domBuilder,errorHandler){//sure start with '<!'
	var next= source.charAt(start+2)
	switch(next){
	case '-':
		if(source.charAt(start + 3) === '-'){
			var end = source.indexOf('-->',start+4);
			//append comment source.substring(4,end)//<!--
			if(end>start){
				domBuilder.comment(source,start+4,end-start-4);
				return end+3;
			}else{
				errorHandler.error("Unclosed comment");
				return -1;
			}
		}else{
			//error
			return -1;
		}
	default:
		if(source.substr(start+3,6) == 'CDATA['){
			var end = source.indexOf(']]>',start+9);
			domBuilder.startCDATA();
			domBuilder.characters(source,start+9,end-start-9);
			domBuilder.endCDATA() 
			return end+3;
		}
		//<!DOCTYPE
		//startDTD(java.lang.String name, java.lang.String publicId, java.lang.String systemId) 
		var matchs = split(source,start);
		var len = matchs.length;
		if(len>1 && /!doctype/i.test(matchs[0][0])){
			var name = matchs[1][0];
			var pubid = false;
			var sysid = false;
			if(len>3){
				if(/^public$/i.test(matchs[2][0])){
					pubid = matchs[3][0];
					sysid = len>4 && matchs[4][0];
				}else if(/^system$/i.test(matchs[2][0])){
					sysid = matchs[3][0];
				}
			}
			var lastMatch = matchs[len-1]
			domBuilder.startDTD(name, pubid, sysid);
			domBuilder.endDTD();
			
			return lastMatch.index+lastMatch[0].length
		}
	}
	return -1;
}



function parseInstruction(source,start,domBuilder){
	var end = source.indexOf('?>',start);
	if(end){
		var match = source.substring(start,end).match(/^<\?(\S*)\s*([\s\S]*?)\s*$/);
		if(match){
			var len = match[0].length;
			domBuilder.processingInstruction(match[1], match[2]) ;
			return end+2;
		}else{//error
			return -1;
		}
	}
	return -1;
}

function ElementAttributes(){
	this.attributeNames = {}
}
ElementAttributes.prototype = {
	setTagName:function(tagName){
		if(!tagNamePattern.test(tagName)){
			throw new Error('invalid tagName:'+tagName)
		}
		this.tagName = tagName
	},
	addValue:function(qName, value, offset) {
		if(!tagNamePattern.test(qName)){
			throw new Error('invalid attribute:'+qName)
		}
		this.attributeNames[qName] = this.length;
		this[this.length++] = {qName:qName,value:value,offset:offset}
	},
	length:0,
	getLocalName:function(i){return this[i].localName},
	getLocator:function(i){return this[i].locator},
	getQName:function(i){return this[i].qName},
	getURI:function(i){return this[i].uri},
	getValue:function(i){return this[i].value}
//	,getIndex:function(uri, localName)){
//		if(localName){
//			
//		}else{
//			var qName = uri
//		}
//	},
//	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
//	getType:function(uri,localName){}
//	getType:function(i){},
}



function split(source,start){
	var match;
	var buf = [];
	var reg = /'[^']+'|"[^"]+"|[^\s<>\/=]+=?|(\/?\s*>|<)/g;
	reg.lastIndex = start;
	reg.exec(source);//skip <
	while(match = reg.exec(source)){
		buf.push(match);
		if(match[1])return buf;
	}
}

exports.XMLReader = XMLReader;
exports.ParseError = ParseError;


/***/ }),

/***/ 133:
/***/ (function(module, __unusedexports, __webpack_require__) {

var debug;

module.exports = function () {
  if (!debug) {
    try {
      /* eslint global-require: off */
      debug = __webpack_require__(237)("follow-redirects");
    }
    catch (error) { /* */ }
    if (typeof debug !== "function") {
      debug = function () { /* */ };
    }
  }
  debug.apply(null, arguments);
};


/***/ }),

/***/ 169:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
    (function standardBrowserEnv() {
      return {
        write: function write(name, value, expires, path, domain, secure) {
          var cookie = [];
          cookie.push(name + '=' + encodeURIComponent(value));

          if (utils.isNumber(expires)) {
            cookie.push('expires=' + new Date(expires).toGMTString());
          }

          if (utils.isString(path)) {
            cookie.push('path=' + path);
          }

          if (utils.isString(domain)) {
            cookie.push('domain=' + domain);
          }

          if (secure === true) {
            cookie.push('secure');
          }

          document.cookie = cookie.join('; ');
        },

        read: function read(name) {
          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
          return (match ? decodeURIComponent(match[3]) : null);
        },

        remove: function remove(name) {
          this.write(name, '', Date.now() - 86400000);
        }
      };
    })() :

  // Non standard browser env (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return {
        write: function write() {},
        read: function read() { return null; },
        remove: function remove() {}
      };
    })()
);


/***/ }),

/***/ 178:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);
var buildURL = __webpack_require__(646);
var InterceptorManager = __webpack_require__(214);
var dispatchRequest = __webpack_require__(62);
var mergeConfig = __webpack_require__(831);
var validator = __webpack_require__(632);

var validators = validator.validators;
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  config = mergeConfig(this.defaults, config);

  // Set config.method
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  var transitional = config.transitional;

  if (transitional !== undefined) {
    validator.assertOptions(transitional, {
      silentJSONParsing: validators.transitional(validators.boolean),
      forcedJSONParsing: validators.transitional(validators.boolean),
      clarifyTimeoutError: validators.transitional(validators.boolean)
    }, false);
  }

  // filter out skipped interceptors
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  var promise;

  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest, undefined];

    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);

    promise = Promise.resolve(config);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }


  var newConfig = config;
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }

  try {
    promise = dispatchRequest(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;


/***/ }),

/***/ 186:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getState = exports.saveState = exports.group = exports.endGroup = exports.startGroup = exports.info = exports.warning = exports.error = exports.debug = exports.isDebug = exports.setFailed = exports.setCommandEcho = exports.setOutput = exports.getBooleanInput = exports.getInput = exports.addPath = exports.setSecret = exports.exportVariable = exports.ExitCode = void 0;
const command_1 = __webpack_require__(351);
const file_command_1 = __webpack_require__(717);
const utils_1 = __webpack_require__(278);
const os = __importStar(__webpack_require__(87));
const path = __importStar(__webpack_require__(622));
/**
 * The code to exit an action
 */
var ExitCode;
(function (ExitCode) {
    /**
     * A code indicating that the action was successful
     */
    ExitCode[ExitCode["Success"] = 0] = "Success";
    /**
     * A code indicating that the action was a failure
     */
    ExitCode[ExitCode["Failure"] = 1] = "Failure";
})(ExitCode = exports.ExitCode || (exports.ExitCode = {}));
//-----------------------------------------------------------------------
// Variables
//-----------------------------------------------------------------------
/**
 * Sets env variable for this action and future actions in the job
 * @param name the name of the variable to set
 * @param val the value of the variable. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportVariable(name, val) {
    const convertedVal = utils_1.toCommandValue(val);
    process.env[name] = convertedVal;
    const filePath = process.env['GITHUB_ENV'] || '';
    if (filePath) {
        const delimiter = '_GitHubActionsFileCommandDelimeter_';
        const commandValue = `${name}<<${delimiter}${os.EOL}${convertedVal}${os.EOL}${delimiter}`;
        file_command_1.issueCommand('ENV', commandValue);
    }
    else {
        command_1.issueCommand('set-env', { name }, convertedVal);
    }
}
exports.exportVariable = exportVariable;
/**
 * Registers a secret which will get masked from logs
 * @param secret value of the secret
 */
function setSecret(secret) {
    command_1.issueCommand('add-mask', {}, secret);
}
exports.setSecret = setSecret;
/**
 * Prepends inputPath to the PATH (for this action and future actions)
 * @param inputPath
 */
function addPath(inputPath) {
    const filePath = process.env['GITHUB_PATH'] || '';
    if (filePath) {
        file_command_1.issueCommand('PATH', inputPath);
    }
    else {
        command_1.issueCommand('add-path', {}, inputPath);
    }
    process.env['PATH'] = `${inputPath}${path.delimiter}${process.env['PATH']}`;
}
exports.addPath = addPath;
/**
 * Gets the value of an input.
 * Unless trimWhitespace is set to false in InputOptions, the value is also trimmed.
 * Returns an empty string if the value is not defined.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string
 */
function getInput(name, options) {
    const val = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
    if (options && options.required && !val) {
        throw new Error(`Input required and not supplied: ${name}`);
    }
    if (options && options.trimWhitespace === false) {
        return val;
    }
    return val.trim();
}
exports.getInput = getInput;
/**
 * Gets the input value of the boolean type in the YAML 1.2 "core schema" specification.
 * Support boolean input list: `true | True | TRUE | false | False | FALSE` .
 * The return value is also in boolean type.
 * ref: https://yaml.org/spec/1.2/spec.html#id2804923
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   boolean
 */
function getBooleanInput(name, options) {
    const trueValue = ['true', 'True', 'TRUE'];
    const falseValue = ['false', 'False', 'FALSE'];
    const val = getInput(name, options);
    if (trueValue.includes(val))
        return true;
    if (falseValue.includes(val))
        return false;
    throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}\n` +
        `Support boolean input list: \`true | True | TRUE | false | False | FALSE\``);
}
exports.getBooleanInput = getBooleanInput;
/**
 * Sets the value of an output.
 *
 * @param     name     name of the output to set
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setOutput(name, value) {
    process.stdout.write(os.EOL);
    command_1.issueCommand('set-output', { name }, value);
}
exports.setOutput = setOutput;
/**
 * Enables or disables the echoing of commands into stdout for the rest of the step.
 * Echoing is disabled by default if ACTIONS_STEP_DEBUG is not set.
 *
 */
function setCommandEcho(enabled) {
    command_1.issue('echo', enabled ? 'on' : 'off');
}
exports.setCommandEcho = setCommandEcho;
//-----------------------------------------------------------------------
// Results
//-----------------------------------------------------------------------
/**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */
function setFailed(message) {
    process.exitCode = ExitCode.Failure;
    error(message);
}
exports.setFailed = setFailed;
//-----------------------------------------------------------------------
// Logging Commands
//-----------------------------------------------------------------------
/**
 * Gets whether Actions Step Debug is on or not
 */
function isDebug() {
    return process.env['RUNNER_DEBUG'] === '1';
}
exports.isDebug = isDebug;
/**
 * Writes debug message to user log
 * @param message debug message
 */
function debug(message) {
    command_1.issueCommand('debug', {}, message);
}
exports.debug = debug;
/**
 * Adds an error issue
 * @param message error issue message. Errors will be converted to string via toString()
 */
function error(message) {
    command_1.issue('error', message instanceof Error ? message.toString() : message);
}
exports.error = error;
/**
 * Adds an warning issue
 * @param message warning issue message. Errors will be converted to string via toString()
 */
function warning(message) {
    command_1.issue('warning', message instanceof Error ? message.toString() : message);
}
exports.warning = warning;
/**
 * Writes info to log with console.log.
 * @param message info message
 */
function info(message) {
    process.stdout.write(message + os.EOL);
}
exports.info = info;
/**
 * Begin an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 *
 * @param name The name of the output group
 */
function startGroup(name) {
    command_1.issue('group', name);
}
exports.startGroup = startGroup;
/**
 * End an output group.
 */
function endGroup() {
    command_1.issue('endgroup');
}
exports.endGroup = endGroup;
/**
 * Wrap an asynchronous function call in a group.
 *
 * Returns the same type as the function itself.
 *
 * @param name The name of the group
 * @param fn The function to wrap in the group
 */
function group(name, fn) {
    return __awaiter(this, void 0, void 0, function* () {
        startGroup(name);
        let result;
        try {
            result = yield fn();
        }
        finally {
            endGroup();
        }
        return result;
    });
}
exports.group = group;
//-----------------------------------------------------------------------
// Wrapper action state
//-----------------------------------------------------------------------
/**
 * Saves state for current action, the state can only be retrieved by this action's post job execution.
 *
 * @param     name     name of the state to store
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveState(name, value) {
    command_1.issueCommand('save-state', { name }, value);
}
exports.saveState = saveState;
/**
 * Gets the value of an state set by this action's main execution.
 *
 * @param     name     name of the state to get
 * @returns   string
 */
function getState(name) {
    return process.env[`STATE_${name}`] || '';
}
exports.getState = getState;
//# sourceMappingURL=core.js.map

/***/ }),

/***/ 189:
/***/ (function(module) {

"use strict";


/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};


/***/ }),

/***/ 190:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);
var normalizeHeaderName = __webpack_require__(240);
var enhanceError = __webpack_require__(516);

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = __webpack_require__(454);
  } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = __webpack_require__(104);
  }
  return adapter;
}

function stringifySafely(rawValue, parser, encoder) {
  if (utils.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

var defaults = {

  transitional: {
    silentJSONParsing: true,
    forcedJSONParsing: true,
    clarifyTimeoutError: false
  },

  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');

    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data) || (headers && headers['Content-Type'] === 'application/json')) {
      setContentTypeIfUnset(headers, 'application/json');
      return stringifySafely(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    var transitional = this.transitional || defaults.transitional;
    var silentJSONParsing = transitional && transitional.silentJSONParsing;
    var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

    if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw enhanceError(e, this, 'E_JSON_PARSE');
          }
          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*'
    }
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;


/***/ }),

/***/ 211:
/***/ (function(module) {

module.exports = require("https");

/***/ }),

/***/ 214:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;


/***/ }),

/***/ 222:
/***/ (function(module, exports, __webpack_require__) {

/* eslint-env browser */

/**
 * This is the web browser implementation of `debug()`.
 */

exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = localstorage();
exports.destroy = (() => {
	let warned = false;

	return () => {
		if (!warned) {
			warned = true;
			console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
		}
	};
})();

/**
 * Colors.
 */

exports.colors = [
	'#0000CC',
	'#0000FF',
	'#0033CC',
	'#0033FF',
	'#0066CC',
	'#0066FF',
	'#0099CC',
	'#0099FF',
	'#00CC00',
	'#00CC33',
	'#00CC66',
	'#00CC99',
	'#00CCCC',
	'#00CCFF',
	'#3300CC',
	'#3300FF',
	'#3333CC',
	'#3333FF',
	'#3366CC',
	'#3366FF',
	'#3399CC',
	'#3399FF',
	'#33CC00',
	'#33CC33',
	'#33CC66',
	'#33CC99',
	'#33CCCC',
	'#33CCFF',
	'#6600CC',
	'#6600FF',
	'#6633CC',
	'#6633FF',
	'#66CC00',
	'#66CC33',
	'#9900CC',
	'#9900FF',
	'#9933CC',
	'#9933FF',
	'#99CC00',
	'#99CC33',
	'#CC0000',
	'#CC0033',
	'#CC0066',
	'#CC0099',
	'#CC00CC',
	'#CC00FF',
	'#CC3300',
	'#CC3333',
	'#CC3366',
	'#CC3399',
	'#CC33CC',
	'#CC33FF',
	'#CC6600',
	'#CC6633',
	'#CC9900',
	'#CC9933',
	'#CCCC00',
	'#CCCC33',
	'#FF0000',
	'#FF0033',
	'#FF0066',
	'#FF0099',
	'#FF00CC',
	'#FF00FF',
	'#FF3300',
	'#FF3333',
	'#FF3366',
	'#FF3399',
	'#FF33CC',
	'#FF33FF',
	'#FF6600',
	'#FF6633',
	'#FF9900',
	'#FF9933',
	'#FFCC00',
	'#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

// eslint-disable-next-line complexity
function useColors() {
	// NB: In an Electron preload script, document will be defined but not fully
	// initialized. Since we know we're in Chrome, we'll just detect this case
	// explicitly
	if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
		return true;
	}

	// Internet Explorer and Edge do not support colors.
	if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
		return false;
	}

	// Is webkit? http://stackoverflow.com/a/16459606/376773
	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
	return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
		// Is firebug? http://stackoverflow.com/a/398120/376773
		(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
		// Is firefox >= v31?
		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
		// Double check webkit in userAgent just in case we are in a worker
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
	args[0] = (this.useColors ? '%c' : '') +
		this.namespace +
		(this.useColors ? ' %c' : ' ') +
		args[0] +
		(this.useColors ? '%c ' : ' ') +
		'+' + module.exports.humanize(this.diff);

	if (!this.useColors) {
		return;
	}

	const c = 'color: ' + this.color;
	args.splice(1, 0, c, 'color: inherit');

	// The final "%c" is somewhat tricky, because there could be other
	// arguments passed either before or after the %c, so we need to
	// figure out the correct index to insert the CSS into
	let index = 0;
	let lastC = 0;
	args[0].replace(/%[a-zA-Z%]/g, match => {
		if (match === '%%') {
			return;
		}
		index++;
		if (match === '%c') {
			// We only are interested in the *last* %c
			// (the user may have provided their own)
			lastC = index;
		}
	});

	args.splice(lastC, 0, c);
}

/**
 * Invokes `console.debug()` when available.
 * No-op when `console.debug` is not a "function".
 * If `console.debug` is not available, falls back
 * to `console.log`.
 *
 * @api public
 */
exports.log = console.debug || console.log || (() => {});

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	try {
		if (namespaces) {
			exports.storage.setItem('debug', namespaces);
		} else {
			exports.storage.removeItem('debug');
		}
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */
function load() {
	let r;
	try {
		r = exports.storage.getItem('debug');
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}

	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
	if (!r && typeof process !== 'undefined' && 'env' in process) {
		r = process.env.DEBUG;
	}

	return r;
}

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
	try {
		// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
		// The Browser also has localStorage in the global context.
		return localStorage;
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

module.exports = __webpack_require__(243)(exports);

const {formatters} = module.exports;

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

formatters.j = function (v) {
	try {
		return JSON.stringify(v);
	} catch (error) {
		return '[UnexpectedJSONParseError]: ' + error.message;
	}
};


/***/ }),

/***/ 226:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var enhanceError = __webpack_require__(516);

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};


/***/ }),

/***/ 237:
/***/ (function(module, __unusedexports, __webpack_require__) {

/**
 * Detect Electron renderer / nwjs process, which is node, but we should
 * treat as a browser.
 */

if (typeof process === 'undefined' || process.type === 'renderer' || process.browser === true || process.__nwjs) {
	module.exports = __webpack_require__(222);
} else {
	module.exports = __webpack_require__(332);
}


/***/ }),

/***/ 240:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};


/***/ }),

/***/ 243:
/***/ (function(module, __unusedexports, __webpack_require__) {


/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */

function setup(env) {
	createDebug.debug = createDebug;
	createDebug.default = createDebug;
	createDebug.coerce = coerce;
	createDebug.disable = disable;
	createDebug.enable = enable;
	createDebug.enabled = enabled;
	createDebug.humanize = __webpack_require__(900);
	createDebug.destroy = destroy;

	Object.keys(env).forEach(key => {
		createDebug[key] = env[key];
	});

	/**
	* The currently active debug mode names, and names to skip.
	*/

	createDebug.names = [];
	createDebug.skips = [];

	/**
	* Map of special "%n" handling functions, for the debug "format" argument.
	*
	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
	*/
	createDebug.formatters = {};

	/**
	* Selects a color for a debug namespace
	* @param {String} namespace The namespace string for the for the debug instance to be colored
	* @return {Number|String} An ANSI color code for the given namespace
	* @api private
	*/
	function selectColor(namespace) {
		let hash = 0;

		for (let i = 0; i < namespace.length; i++) {
			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}

		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	}
	createDebug.selectColor = selectColor;

	/**
	* Create a debugger with the given `namespace`.
	*
	* @param {String} namespace
	* @return {Function}
	* @api public
	*/
	function createDebug(namespace) {
		let prevTime;
		let enableOverride = null;

		function debug(...args) {
			// Disabled?
			if (!debug.enabled) {
				return;
			}

			const self = debug;

			// Set `diff` timestamp
			const curr = Number(new Date());
			const ms = curr - (prevTime || curr);
			self.diff = ms;
			self.prev = prevTime;
			self.curr = curr;
			prevTime = curr;

			args[0] = createDebug.coerce(args[0]);

			if (typeof args[0] !== 'string') {
				// Anything else let's inspect with %O
				args.unshift('%O');
			}

			// Apply any `formatters` transformations
			let index = 0;
			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
				// If we encounter an escaped % then don't increase the array index
				if (match === '%%') {
					return '%';
				}
				index++;
				const formatter = createDebug.formatters[format];
				if (typeof formatter === 'function') {
					const val = args[index];
					match = formatter.call(self, val);

					// Now we need to remove `args[index]` since it's inlined in the `format`
					args.splice(index, 1);
					index--;
				}
				return match;
			});

			// Apply env-specific formatting (colors, etc.)
			createDebug.formatArgs.call(self, args);

			const logFn = self.log || createDebug.log;
			logFn.apply(self, args);
		}

		debug.namespace = namespace;
		debug.useColors = createDebug.useColors();
		debug.color = createDebug.selectColor(namespace);
		debug.extend = extend;
		debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

		Object.defineProperty(debug, 'enabled', {
			enumerable: true,
			configurable: false,
			get: () => enableOverride === null ? createDebug.enabled(namespace) : enableOverride,
			set: v => {
				enableOverride = v;
			}
		});

		// Env-specific initialization logic for debug instances
		if (typeof createDebug.init === 'function') {
			createDebug.init(debug);
		}

		return debug;
	}

	function extend(namespace, delimiter) {
		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
		newDebug.log = this.log;
		return newDebug;
	}

	/**
	* Enables a debug mode by namespaces. This can include modes
	* separated by a colon and wildcards.
	*
	* @param {String} namespaces
	* @api public
	*/
	function enable(namespaces) {
		createDebug.save(namespaces);

		createDebug.names = [];
		createDebug.skips = [];

		let i;
		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
		const len = split.length;

		for (i = 0; i < len; i++) {
			if (!split[i]) {
				// ignore empty strings
				continue;
			}

			namespaces = split[i].replace(/\*/g, '.*?');

			if (namespaces[0] === '-') {
				createDebug.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
			} else {
				createDebug.names.push(new RegExp('^' + namespaces + '$'));
			}
		}
	}

	/**
	* Disable debug output.
	*
	* @return {String} namespaces
	* @api public
	*/
	function disable() {
		const namespaces = [
			...createDebug.names.map(toNamespace),
			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
		].join(',');
		createDebug.enable('');
		return namespaces;
	}

	/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
	function enabled(name) {
		if (name[name.length - 1] === '*') {
			return true;
		}

		let i;
		let len;

		for (i = 0, len = createDebug.skips.length; i < len; i++) {
			if (createDebug.skips[i].test(name)) {
				return false;
			}
		}

		for (i = 0, len = createDebug.names.length; i < len; i++) {
			if (createDebug.names[i].test(name)) {
				return true;
			}
		}

		return false;
	}

	/**
	* Convert regexp to namespace
	*
	* @param {RegExp} regxep
	* @return {String} namespace
	* @api private
	*/
	function toNamespace(regexp) {
		return regexp.toString()
			.substring(2, regexp.toString().length - 2)
			.replace(/\.\*\?$/, '*');
	}

	/**
	* Coerce `val`.
	*
	* @param {Mixed} val
	* @return {Mixed}
	* @api private
	*/
	function coerce(val) {
		if (val instanceof Error) {
			return val.stack || val.message;
		}
		return val;
	}

	/**
	* XXX DO NOT USE. This is a temporary stub function.
	* XXX It WILL be removed in the next major release.
	*/
	function destroy() {
		console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
	}

	createDebug.enable(createDebug.load());

	return createDebug;
}

module.exports = setup;


/***/ }),

/***/ 260:
/***/ (function(module) {

"use strict";

var token = '%[a-f0-9]{2}';
var singleMatcher = new RegExp(token, 'gi');
var multiMatcher = new RegExp('(' + token + ')+', 'gi');

function decodeComponents(components, split) {
	try {
		// Try to decode the entire string first
		return decodeURIComponent(components.join(''));
	} catch (err) {
		// Do nothing
	}

	if (components.length === 1) {
		return components;
	}

	split = split || 1;

	// Split the array in 2 parts
	var left = components.slice(0, split);
	var right = components.slice(split);

	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
}

function decode(input) {
	try {
		return decodeURIComponent(input);
	} catch (err) {
		var tokens = input.match(singleMatcher);

		for (var i = 1; i < tokens.length; i++) {
			input = decodeComponents(tokens, i).join('');

			tokens = input.match(singleMatcher);
		}

		return input;
	}
}

function customDecodeURIComponent(input) {
	// Keep track of all the replacements and prefill the map with the `BOM`
	var replaceMap = {
		'%FE%FF': '\uFFFD\uFFFD',
		'%FF%FE': '\uFFFD\uFFFD'
	};

	var match = multiMatcher.exec(input);
	while (match) {
		try {
			// Decode as big chunks as possible
			replaceMap[match[0]] = decodeURIComponent(match[0]);
		} catch (err) {
			var result = decode(match[0]);

			if (result !== match[0]) {
				replaceMap[match[0]] = result;
			}
		}

		match = multiMatcher.exec(input);
	}

	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
	replaceMap['%C2'] = '\uFFFD';

	var entries = Object.keys(replaceMap);

	for (var i = 0; i < entries.length; i++) {
		// Replace all decoded components
		var key = entries[i];
		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
	}

	return input;
}

module.exports = function (encodedURI) {
	if (typeof encodedURI !== 'string') {
		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
	}

	try {
		encodedURI = encodedURI.replace(/\+/g, ' ');

		// Try the built in decoder first
		return decodeURIComponent(encodedURI);
	} catch (err) {
		// Fallback to a more advanced decoder
		return customDecodeURIComponent(encodedURI);
	}
};


/***/ }),

/***/ 278:
/***/ (function(__unusedmodule, exports) {

"use strict";

// We use any as a valid input type
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCommandValue = void 0;
/**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */
function toCommandValue(input) {
    if (input === null || input === undefined) {
        return '';
    }
    else if (typeof input === 'string' || input instanceof String) {
        return input;
    }
    return JSON.stringify(input);
}
exports.toCommandValue = toCommandValue;
//# sourceMappingURL=utils.js.map

/***/ }),

/***/ 279:
/***/ (function(module, __unusedexports, __webpack_require__) {

const { GoogleTranslator } = __webpack_require__(353);

const translator = new GoogleTranslator();

async function translateString(string) {
	let output = '';

	try {
		output = await translator.translate(string, 'no', 'en');
	} catch (error) {
		console.error('Translations failed', error);
	}
	return output;
}

module.exports = { translateString };


/***/ }),

/***/ 286:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

function DOMParser(options){
	this.options = options ||{locator:{}};
}

DOMParser.prototype.parseFromString = function(source,mimeType){
	var options = this.options;
	var sax =  new XMLReader();
	var domBuilder = options.domBuilder || new DOMHandler();//contentHandler and LexicalHandler
	var errorHandler = options.errorHandler;
	var locator = options.locator;
	var defaultNSMap = options.xmlns||{};
	var isHTML = /\/x?html?$/.test(mimeType);//mimeType.toLowerCase().indexOf('html') > -1;
  	var entityMap = isHTML?htmlEntity.entityMap:{'lt':'<','gt':'>','amp':'&','quot':'"','apos':"'"};
	if(locator){
		domBuilder.setDocumentLocator(locator)
	}

	sax.errorHandler = buildErrorHandler(errorHandler,domBuilder,locator);
	sax.domBuilder = options.domBuilder || domBuilder;
	if(isHTML){
		defaultNSMap['']= 'http://www.w3.org/1999/xhtml';
	}
	defaultNSMap.xml = defaultNSMap.xml || 'http://www.w3.org/XML/1998/namespace';
	if(source && typeof source === 'string'){
		sax.parse(source,defaultNSMap,entityMap);
	}else{
		sax.errorHandler.error("invalid doc source");
	}
	return domBuilder.doc;
}
function buildErrorHandler(errorImpl,domBuilder,locator){
	if(!errorImpl){
		if(domBuilder instanceof DOMHandler){
			return domBuilder;
		}
		errorImpl = domBuilder ;
	}
	var errorHandler = {}
	var isCallback = errorImpl instanceof Function;
	locator = locator||{}
	function build(key){
		var fn = errorImpl[key];
		if(!fn && isCallback){
			fn = errorImpl.length == 2?function(msg){errorImpl(key,msg)}:errorImpl;
		}
		errorHandler[key] = fn && function(msg){
			fn('[xmldom '+key+']\t'+msg+_locator(locator));
		}||function(){};
	}
	build('warning');
	build('error');
	build('fatalError');
	return errorHandler;
}

//console.log('#\n\n\n\n\n\n\n####')
/**
 * +ContentHandler+ErrorHandler
 * +LexicalHandler+EntityResolver2
 * -DeclHandler-DTDHandler
 *
 * DefaultHandler:EntityResolver, DTDHandler, ContentHandler, ErrorHandler
 * DefaultHandler2:DefaultHandler,LexicalHandler, DeclHandler, EntityResolver2
 * @link http://www.saxproject.org/apidoc/org/xml/sax/helpers/DefaultHandler.html
 */
function DOMHandler() {
    this.cdata = false;
}
function position(locator,node){
	node.lineNumber = locator.lineNumber;
	node.columnNumber = locator.columnNumber;
}
/**
 * @see org.xml.sax.ContentHandler#startDocument
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
 */
DOMHandler.prototype = {
	startDocument : function() {
    	this.doc = new DOMImplementation().createDocument(null, null, null);
    	if (this.locator) {
        	this.doc.documentURI = this.locator.systemId;
    	}
	},
	startElement:function(namespaceURI, localName, qName, attrs) {
		var doc = this.doc;
	    var el = doc.createElementNS(namespaceURI, qName||localName);
	    var len = attrs.length;
	    appendElement(this, el);
	    this.currentElement = el;

		this.locator && position(this.locator,el)
	    for (var i = 0 ; i < len; i++) {
	        var namespaceURI = attrs.getURI(i);
	        var value = attrs.getValue(i);
	        var qName = attrs.getQName(i);
			var attr = doc.createAttributeNS(namespaceURI, qName);
			this.locator &&position(attrs.getLocator(i),attr);
			attr.value = attr.nodeValue = value;
			el.setAttributeNode(attr)
	    }
	},
	endElement:function(namespaceURI, localName, qName) {
		var current = this.currentElement
		var tagName = current.tagName;
		this.currentElement = current.parentNode;
	},
	startPrefixMapping:function(prefix, uri) {
	},
	endPrefixMapping:function(prefix) {
	},
	processingInstruction:function(target, data) {
	    var ins = this.doc.createProcessingInstruction(target, data);
	    this.locator && position(this.locator,ins)
	    appendElement(this, ins);
	},
	ignorableWhitespace:function(ch, start, length) {
	},
	characters:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
		//console.log(chars)
		if(chars){
			if (this.cdata) {
				var charNode = this.doc.createCDATASection(chars);
			} else {
				var charNode = this.doc.createTextNode(chars);
			}
			if(this.currentElement){
				this.currentElement.appendChild(charNode);
			}else if(/^\s*$/.test(chars)){
				this.doc.appendChild(charNode);
				//process xml
			}
			this.locator && position(this.locator,charNode)
		}
	},
	skippedEntity:function(name) {
	},
	endDocument:function() {
		this.doc.normalize();
	},
	setDocumentLocator:function (locator) {
	    if(this.locator = locator){// && !('lineNumber' in locator)){
	    	locator.lineNumber = 0;
	    }
	},
	//LexicalHandler
	comment:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
	    var comm = this.doc.createComment(chars);
	    this.locator && position(this.locator,comm)
	    appendElement(this, comm);
	},

	startCDATA:function() {
	    //used in characters() methods
	    this.cdata = true;
	},
	endCDATA:function() {
	    this.cdata = false;
	},

	startDTD:function(name, publicId, systemId) {
		var impl = this.doc.implementation;
	    if (impl && impl.createDocumentType) {
	        var dt = impl.createDocumentType(name, publicId, systemId);
	        this.locator && position(this.locator,dt)
	        appendElement(this, dt);
	    }
	},
	/**
	 * @see org.xml.sax.ErrorHandler
	 * @link http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
	 */
	warning:function(error) {
		console.warn('[xmldom warning]\t'+error,_locator(this.locator));
	},
	error:function(error) {
		console.error('[xmldom error]\t'+error,_locator(this.locator));
	},
	fatalError:function(error) {
		throw new ParseError(error, this.locator);
	}
}
function _locator(l){
	if(l){
		return '\n@'+(l.systemId ||'')+'#[line:'+l.lineNumber+',col:'+l.columnNumber+']'
	}
}
function _toString(chars,start,length){
	if(typeof chars == 'string'){
		return chars.substr(start,length)
	}else{//java sax connect width xmldom on rhino(what about: "? && !(chars instanceof String)")
		if(chars.length >= start+length || start){
			return new java.lang.String(chars,start,length)+'';
		}
		return chars;
	}
}

/*
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/LexicalHandler.html
 * used method of org.xml.sax.ext.LexicalHandler:
 *  #comment(chars, start, length)
 *  #startCDATA()
 *  #endCDATA()
 *  #startDTD(name, publicId, systemId)
 *
 *
 * IGNORED method of org.xml.sax.ext.LexicalHandler:
 *  #endDTD()
 *  #startEntity(name)
 *  #endEntity(name)
 *
 *
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/DeclHandler.html
 * IGNORED method of org.xml.sax.ext.DeclHandler
 * 	#attributeDecl(eName, aName, type, mode, value)
 *  #elementDecl(name, model)
 *  #externalEntityDecl(name, publicId, systemId)
 *  #internalEntityDecl(name, value)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/EntityResolver2.html
 * IGNORED method of org.xml.sax.EntityResolver2
 *  #resolveEntity(String name,String publicId,String baseURI,String systemId)
 *  #resolveEntity(publicId, systemId)
 *  #getExternalSubset(name, baseURI)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/DTDHandler.html
 * IGNORED method of org.xml.sax.DTDHandler
 *  #notationDecl(name, publicId, systemId) {};
 *  #unparsedEntityDecl(name, publicId, systemId, notationName) {};
 */
"endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g,function(key){
	DOMHandler.prototype[key] = function(){return null}
})

/* Private static helpers treated below as private instance methods, so don't need to add these to the public API; we might use a Relator to also get rid of non-standard public properties */
function appendElement (hander,node) {
    if (!hander.currentElement) {
        hander.doc.appendChild(node);
    } else {
        hander.currentElement.appendChild(node);
    }
}//appendChild and setAttributeNS are preformance key

//if(typeof require == 'function'){
var htmlEntity = __webpack_require__(507);
var sax = __webpack_require__(124);
var XMLReader = sax.XMLReader;
var ParseError = sax.ParseError;
var DOMImplementation = exports.DOMImplementation = __webpack_require__(555).DOMImplementation;
exports.XMLSerializer = __webpack_require__(555).XMLSerializer ;
exports.DOMParser = DOMParser;
exports.__DOMHandler = DOMHandler;
//}


/***/ }),

/***/ 293:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

const strictUriEncode = __webpack_require__(528);
const decodeComponent = __webpack_require__(260);
const splitOnFirst = __webpack_require__(878);
const filterObject = __webpack_require__(940);

const isNullOrUndefined = value => value === null || value === undefined;

function encoderForArrayFormat(options) {
	switch (options.arrayFormat) {
		case 'index':
			return key => (result, value) => {
				const index = result.length;

				if (
					value === undefined ||
					(options.skipNull && value === null) ||
					(options.skipEmptyString && value === '')
				) {
					return result;
				}

				if (value === null) {
					return [...result, [encode(key, options), '[', index, ']'].join('')];
				}

				return [
					...result,
					[encode(key, options), '[', encode(index, options), ']=', encode(value, options)].join('')
				];
			};

		case 'bracket':
			return key => (result, value) => {
				if (
					value === undefined ||
					(options.skipNull && value === null) ||
					(options.skipEmptyString && value === '')
				) {
					return result;
				}

				if (value === null) {
					return [...result, [encode(key, options), '[]'].join('')];
				}

				return [...result, [encode(key, options), '[]=', encode(value, options)].join('')];
			};

		case 'comma':
		case 'separator':
			return key => (result, value) => {
				if (value === null || value === undefined || value.length === 0) {
					return result;
				}

				if (result.length === 0) {
					return [[encode(key, options), '=', encode(value, options)].join('')];
				}

				return [[result, encode(value, options)].join(options.arrayFormatSeparator)];
			};

		default:
			return key => (result, value) => {
				if (
					value === undefined ||
					(options.skipNull && value === null) ||
					(options.skipEmptyString && value === '')
				) {
					return result;
				}

				if (value === null) {
					return [...result, encode(key, options)];
				}

				return [...result, [encode(key, options), '=', encode(value, options)].join('')];
			};
	}
}

function parserForArrayFormat(options) {
	let result;

	switch (options.arrayFormat) {
		case 'index':
			return (key, value, accumulator) => {
				result = /\[(\d*)\]$/.exec(key);

				key = key.replace(/\[\d*\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = {};
				}

				accumulator[key][result[1]] = value;
			};

		case 'bracket':
			return (key, value, accumulator) => {
				result = /(\[\])$/.exec(key);
				key = key.replace(/\[\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = [value];
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};

		case 'comma':
		case 'separator':
			return (key, value, accumulator) => {
				const isArray = typeof value === 'string' && value.includes(options.arrayFormatSeparator);
				const isEncodedArray = (typeof value === 'string' && !isArray && decode(value, options).includes(options.arrayFormatSeparator));
				value = isEncodedArray ? decode(value, options) : value;
				const newValue = isArray || isEncodedArray ? value.split(options.arrayFormatSeparator).map(item => decode(item, options)) : value === null ? value : decode(value, options);
				accumulator[key] = newValue;
			};

		default:
			return (key, value, accumulator) => {
				if (accumulator[key] === undefined) {
					accumulator[key] = value;
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};
	}
}

function validateArrayFormatSeparator(value) {
	if (typeof value !== 'string' || value.length !== 1) {
		throw new TypeError('arrayFormatSeparator must be single character string');
	}
}

function encode(value, options) {
	if (options.encode) {
		return options.strict ? strictUriEncode(value) : encodeURIComponent(value);
	}

	return value;
}

function decode(value, options) {
	if (options.decode) {
		return decodeComponent(value);
	}

	return value;
}

function keysSorter(input) {
	if (Array.isArray(input)) {
		return input.sort();
	}

	if (typeof input === 'object') {
		return keysSorter(Object.keys(input))
			.sort((a, b) => Number(a) - Number(b))
			.map(key => input[key]);
	}

	return input;
}

function removeHash(input) {
	const hashStart = input.indexOf('#');
	if (hashStart !== -1) {
		input = input.slice(0, hashStart);
	}

	return input;
}

function getHash(url) {
	let hash = '';
	const hashStart = url.indexOf('#');
	if (hashStart !== -1) {
		hash = url.slice(hashStart);
	}

	return hash;
}

function extract(input) {
	input = removeHash(input);
	const queryStart = input.indexOf('?');
	if (queryStart === -1) {
		return '';
	}

	return input.slice(queryStart + 1);
}

function parseValue(value, options) {
	if (options.parseNumbers && !Number.isNaN(Number(value)) && (typeof value === 'string' && value.trim() !== '')) {
		value = Number(value);
	} else if (options.parseBooleans && value !== null && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
		value = value.toLowerCase() === 'true';
	}

	return value;
}

function parse(query, options) {
	options = Object.assign({
		decode: true,
		sort: true,
		arrayFormat: 'none',
		arrayFormatSeparator: ',',
		parseNumbers: false,
		parseBooleans: false
	}, options);

	validateArrayFormatSeparator(options.arrayFormatSeparator);

	const formatter = parserForArrayFormat(options);

	// Create an object with no prototype
	const ret = Object.create(null);

	if (typeof query !== 'string') {
		return ret;
	}

	query = query.trim().replace(/^[?#&]/, '');

	if (!query) {
		return ret;
	}

	for (const param of query.split('&')) {
		if (param === '') {
			continue;
		}

		let [key, value] = splitOnFirst(options.decode ? param.replace(/\+/g, ' ') : param, '=');

		// Missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		value = value === undefined ? null : ['comma', 'separator'].includes(options.arrayFormat) ? value : decode(value, options);
		formatter(decode(key, options), value, ret);
	}

	for (const key of Object.keys(ret)) {
		const value = ret[key];
		if (typeof value === 'object' && value !== null) {
			for (const k of Object.keys(value)) {
				value[k] = parseValue(value[k], options);
			}
		} else {
			ret[key] = parseValue(value, options);
		}
	}

	if (options.sort === false) {
		return ret;
	}

	return (options.sort === true ? Object.keys(ret).sort() : Object.keys(ret).sort(options.sort)).reduce((result, key) => {
		const value = ret[key];
		if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
			// Sort object keys, not values
			result[key] = keysSorter(value);
		} else {
			result[key] = value;
		}

		return result;
	}, Object.create(null));
}

exports.extract = extract;
exports.parse = parse;

exports.stringify = (object, options) => {
	if (!object) {
		return '';
	}

	options = Object.assign({
		encode: true,
		strict: true,
		arrayFormat: 'none',
		arrayFormatSeparator: ','
	}, options);

	validateArrayFormatSeparator(options.arrayFormatSeparator);

	const shouldFilter = key => (
		(options.skipNull && isNullOrUndefined(object[key])) ||
		(options.skipEmptyString && object[key] === '')
	);

	const formatter = encoderForArrayFormat(options);

	const objectCopy = {};

	for (const key of Object.keys(object)) {
		if (!shouldFilter(key)) {
			objectCopy[key] = object[key];
		}
	}

	const keys = Object.keys(objectCopy);

	if (options.sort !== false) {
		keys.sort(options.sort);
	}

	return keys.map(key => {
		const value = object[key];

		if (value === undefined) {
			return '';
		}

		if (value === null) {
			return encode(key, options);
		}

		if (Array.isArray(value)) {
			return value
				.reduce(formatter(key), [])
				.join('&');
		}

		return encode(key, options) + '=' + encode(value, options);
	}).filter(x => x.length > 0).join('&');
};

exports.parseUrl = (url, options) => {
	options = Object.assign({
		decode: true
	}, options);

	const [url_, hash] = splitOnFirst(url, '#');

	return Object.assign(
		{
			url: url_.split('?')[0] || '',
			query: parse(extract(url), options)
		},
		options && options.parseFragmentIdentifier && hash ? {fragmentIdentifier: decode(hash, options)} : {}
	);
};

exports.stringifyUrl = (object, options) => {
	options = Object.assign({
		encode: true,
		strict: true
	}, options);

	const url = removeHash(object.url).split('?')[0] || '';
	const queryFromUrl = exports.extract(object.url);
	const parsedQueryFromUrl = exports.parse(queryFromUrl, {sort: false});

	const query = Object.assign(parsedQueryFromUrl, object.query);
	let queryString = exports.stringify(query, options);
	if (queryString) {
		queryString = `?${queryString}`;
	}

	let hash = getHash(object.url);
	if (object.fragmentIdentifier) {
		hash = `#${encode(object.fragmentIdentifier, options)}`;
	}

	return `${url}${queryString}${hash}`;
};

exports.pick = (input, filter, options) => {
	options = Object.assign({
		parseFragmentIdentifier: true
	}, options);

	const {url, query, fragmentIdentifier} = exports.parseUrl(input, options);
	return exports.stringifyUrl({
		url,
		query: filterObject(query, filter),
		fragmentIdentifier
	}, options);
};

exports.exclude = (input, filter, options) => {
	const exclusionFilter = Array.isArray(filter) ? key => !filter.includes(key) : (key, value) => !filter(key, value);

	return exports.pick(input, exclusionFilter, options);
};


/***/ }),

/***/ 301:
/***/ (function(module) {

"use strict";


/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};


/***/ }),

/***/ 318:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";

const os = __webpack_require__(87);
const hasFlag = __webpack_require__(621);

const env = process.env;

let forceColor;
if (hasFlag('no-color') ||
	hasFlag('no-colors') ||
	hasFlag('color=false')) {
	forceColor = false;
} else if (hasFlag('color') ||
	hasFlag('colors') ||
	hasFlag('color=true') ||
	hasFlag('color=always')) {
	forceColor = true;
}
if ('FORCE_COLOR' in env) {
	forceColor = env.FORCE_COLOR.length === 0 || parseInt(env.FORCE_COLOR, 10) !== 0;
}

function translateLevel(level) {
	if (level === 0) {
		return false;
	}

	return {
		level,
		hasBasic: true,
		has256: level >= 2,
		has16m: level >= 3
	};
}

function supportsColor(stream) {
	if (forceColor === false) {
		return 0;
	}

	if (hasFlag('color=16m') ||
		hasFlag('color=full') ||
		hasFlag('color=truecolor')) {
		return 3;
	}

	if (hasFlag('color=256')) {
		return 2;
	}

	if (stream && !stream.isTTY && forceColor !== true) {
		return 0;
	}

	const min = forceColor ? 1 : 0;

	if (process.platform === 'win32') {
		// Node.js 7.5.0 is the first version of Node.js to include a patch to
		// libuv that enables 256 color output on Windows. Anything earlier and it
		// won't work. However, here we target Node.js 8 at minimum as it is an LTS
		// release, and Node.js 7 is not. Windows 10 build 10586 is the first Windows
		// release that supports 256 colors. Windows 10 build 14931 is the first release
		// that supports 16m/TrueColor.
		const osRelease = os.release().split('.');
		if (
			Number(process.versions.node.split('.')[0]) >= 8 &&
			Number(osRelease[0]) >= 10 &&
			Number(osRelease[2]) >= 10586
		) {
			return Number(osRelease[2]) >= 14931 ? 3 : 2;
		}

		return 1;
	}

	if ('CI' in env) {
		if (['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI'].some(sign => sign in env) || env.CI_NAME === 'codeship') {
			return 1;
		}

		return min;
	}

	if ('TEAMCITY_VERSION' in env) {
		return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
	}

	if (env.COLORTERM === 'truecolor') {
		return 3;
	}

	if ('TERM_PROGRAM' in env) {
		const version = parseInt((env.TERM_PROGRAM_VERSION || '').split('.')[0], 10);

		switch (env.TERM_PROGRAM) {
			case 'iTerm.app':
				return version >= 3 ? 3 : 2;
			case 'Apple_Terminal':
				return 2;
			// No default
		}
	}

	if (/-256(color)?$/i.test(env.TERM)) {
		return 2;
	}

	if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
		return 1;
	}

	if ('COLORTERM' in env) {
		return 1;
	}

	if (env.TERM === 'dumb') {
		return min;
	}

	return min;
}

function getSupportLevel(stream) {
	const level = supportsColor(stream);
	return translateLevel(level);
}

module.exports = {
	supportsColor: getSupportLevel,
	stdout: getSupportLevel(process.stdout),
	stderr: getSupportLevel(process.stderr)
};


/***/ }),

/***/ 319:
/***/ (function(__unusedmodule, exports) {

/*
 * xpath.js
 *
 * An XPath 1.0 library for JavaScript.
 *
 * Cameron McCormack <cam (at) mcc.id.au>
 *
 * This work is licensed under the MIT License.
 *
 * Revision 20: April 26, 2011
 *   Fixed a typo resulting in FIRST_ORDERED_NODE_TYPE results being wrong,
 *   thanks to <shi_a009 (at) hotmail.com>.
 *
 * Revision 19: November 29, 2005
 *   Nodesets now store their nodes in a height balanced tree, increasing
 *   performance for the common case of selecting nodes in document order,
 *   thanks to Sébastien Cramatte <contact (at) zeninteractif.com>.
 *   AVL tree code adapted from Raimund Neumann <rnova (at) gmx.net>.
 *
 * Revision 18: October 27, 2005
 *   DOM 3 XPath support.  Caveats:
 *     - namespace prefixes aren't resolved in XPathEvaluator.createExpression,
 *       but in XPathExpression.evaluate.
 *     - XPathResult.invalidIteratorState is not implemented.
 *
 * Revision 17: October 25, 2005
 *   Some core XPath function fixes and a patch to avoid crashing certain
 *   versions of MSXML in PathExpr.prototype.getOwnerElement, thanks to
 *   Sébastien Cramatte <contact (at) zeninteractif.com>.
 *
 * Revision 16: September 22, 2005
 *   Workarounds for some IE 5.5 deficiencies.
 *   Fixed problem with prefix node tests on attribute nodes.
 *
 * Revision 15: May 21, 2005
 *   Fixed problem with QName node tests on elements with an xmlns="...".
 *
 * Revision 14: May 19, 2005
 *   Fixed QName node tests on attribute node regression.
 *
 * Revision 13: May 3, 2005
 *   Node tests are case insensitive now if working in an HTML DOM.
 *
 * Revision 12: April 26, 2005
 *   Updated licence.  Slight code changes to enable use of Dean
 *   Edwards' script compression, http://dean.edwards.name/packer/ .
 *
 * Revision 11: April 23, 2005
 *   Fixed bug with 'and' and 'or' operators, fix thanks to
 *   Sandy McArthur <sandy (at) mcarthur.org>.
 *
 * Revision 10: April 15, 2005
 *   Added support for a virtual root node, supposedly helpful for
 *   implementing XForms.  Fixed problem with QName node tests and
 *   the parent axis.
 *
 * Revision 9: March 17, 2005
 *   Namespace resolver tweaked so using the document node as the context
 *   for namespace lookups is equivalent to using the document element.
 *
 * Revision 8: February 13, 2005
 *   Handle implicit declaration of 'xmlns' namespace prefix.
 *   Fixed bug when comparing nodesets.
 *   Instance data can now be associated with a FunctionResolver, and
 *     workaround for MSXML not supporting 'localName' and 'getElementById',
 *     thanks to Grant Gongaware.
 *   Fix a few problems when the context node is the root node.
 *
 * Revision 7: February 11, 2005
 *   Default namespace resolver fix from Grant Gongaware
 *   <grant (at) gongaware.com>.
 *
 * Revision 6: February 10, 2005
 *   Fixed bug in 'number' function.
 *
 * Revision 5: February 9, 2005
 *   Fixed bug where text nodes not getting converted to string values.
 *
 * Revision 4: January 21, 2005
 *   Bug in 'name' function, fix thanks to Bill Edney.
 *   Fixed incorrect processing of namespace nodes.
 *   Fixed NamespaceResolver to resolve 'xml' namespace.
 *   Implemented union '|' operator.
 *
 * Revision 3: January 14, 2005
 *   Fixed bug with nodeset comparisons, bug lexing < and >.
 *
 * Revision 2: October 26, 2004
 *   QName node test namespace handling fixed.  Few other bug fixes.
 *
 * Revision 1: August 13, 2004
 *   Bug fixes from William J. Edney <bedney (at) technicalpursuit.com>.
 *   Added minimal licence.
 *
 * Initial version: June 14, 2004
 */

// non-node wrapper
var xpath = ( false) ? undefined : exports;

(function (exports) {
    "use strict";

    // functional helpers
    function curry(func) {
        var slice = Array.prototype.slice,
            totalargs = func.length,
            partial = function (args, fn) {
                return function () {
                    return fn.apply(this, args.concat(slice.call(arguments)));
                }
            },
            fn = function () {
                var args = slice.call(arguments);
                return (args.length < totalargs) ?
                    partial(args, fn) :
                    func.apply(this, slice.apply(arguments, [0, totalargs]));
            };
        return fn;
    }

    var forEach = function (f, xs) {
        for (var i = 0; i < xs.length; i += 1) {
            f(xs[i], i, xs);
        }
    };

    var reduce = function (f, seed, xs) {
        var acc = seed;

        forEach(function (x, i) { acc = f(acc, x, i); }, xs);

        return acc;
    };

    var map = function (f, xs) {
        var mapped = new Array(xs.length);

        forEach(function (x, i) { mapped[i] = f(x); }, xs);

        return mapped;
    };

    var filter = function (f, xs) {
        var filtered = [];

        forEach(function (x, i) { if (f(x, i)) { filtered.push(x); } }, xs);

        return filtered;
    };

    var includes = function (values, value) {
        for (var i = 0; i < values.length; i += 1) {
            if (values[i] === value) {
                return true;
            }
        }

        return false;
    };

    function always(value) { return function () { return value; } }

    function toString(x) { return x.toString(); }
    var join = function (s, xs) { return xs.join(s); };
    var wrap = function (pref, suf, str) { return pref + str + suf; };

    var prototypeConcat = Array.prototype.concat;

    // .apply() fails above a certain number of arguments - https://github.com/goto100/xpath/pull/98
    var MAX_ARGUMENT_LENGTH = 32767;

    function flatten(arr) {
        var result = [];

        for (var start = 0; start < arr.length; start += MAX_ARGUMENT_LENGTH) {
            var chunk = arr.slice(start, start + MAX_ARGUMENT_LENGTH);
            
            result = prototypeConcat.apply(result, chunk);
        }
        
        return result;
    }

    function assign(target, varArgs) { // .length of function is 2
        var to = Object(target);

        for (var index = 1; index < arguments.length; index++) {
            var nextSource = arguments[index];

            if (nextSource != null) { // Skip over if undefined or null
                for (var nextKey in nextSource) {
                    // Avoid bugs when hasOwnProperty is shadowed
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }

        return to;
    }

    // XPathParser ///////////////////////////////////////////////////////////////

    XPathParser.prototype = new Object();
    XPathParser.prototype.constructor = XPathParser;
    XPathParser.superclass = Object.prototype;

    function XPathParser() {
        this.init();
    }

    XPathParser.prototype.init = function () {
        this.reduceActions = [];

        this.reduceActions[3] = function (rhs) {
            return new OrOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[5] = function (rhs) {
            return new AndOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[7] = function (rhs) {
            return new EqualsOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[8] = function (rhs) {
            return new NotEqualOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[10] = function (rhs) {
            return new LessThanOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[11] = function (rhs) {
            return new GreaterThanOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[12] = function (rhs) {
            return new LessThanOrEqualOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[13] = function (rhs) {
            return new GreaterThanOrEqualOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[15] = function (rhs) {
            return new PlusOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[16] = function (rhs) {
            return new MinusOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[18] = function (rhs) {
            return new MultiplyOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[19] = function (rhs) {
            return new DivOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[20] = function (rhs) {
            return new ModOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[22] = function (rhs) {
            return new UnaryMinusOperation(rhs[1]);
        };
        this.reduceActions[24] = function (rhs) {
            return new BarOperation(rhs[0], rhs[2]);
        };
        this.reduceActions[25] = function (rhs) {
            return new PathExpr(undefined, undefined, rhs[0]);
        };
        this.reduceActions[27] = function (rhs) {
            rhs[0].locationPath = rhs[2];
            return rhs[0];
        };
        this.reduceActions[28] = function (rhs) {
            rhs[0].locationPath = rhs[2];
            rhs[0].locationPath.steps.unshift(new Step(Step.DESCENDANTORSELF, NodeTest.nodeTest, []));
            return rhs[0];
        };
        this.reduceActions[29] = function (rhs) {
            return new PathExpr(rhs[0], [], undefined);
        };
        this.reduceActions[30] = function (rhs) {
            if (Utilities.instance_of(rhs[0], PathExpr)) {
                if (rhs[0].filterPredicates == undefined) {
                    rhs[0].filterPredicates = [];
                }
                rhs[0].filterPredicates.push(rhs[1]);
                return rhs[0];
            } else {
                return new PathExpr(rhs[0], [rhs[1]], undefined);
            }
        };
        this.reduceActions[32] = function (rhs) {
            return rhs[1];
        };
        this.reduceActions[33] = function (rhs) {
            return new XString(rhs[0]);
        };
        this.reduceActions[34] = function (rhs) {
            return new XNumber(rhs[0]);
        };
        this.reduceActions[36] = function (rhs) {
            return new FunctionCall(rhs[0], []);
        };
        this.reduceActions[37] = function (rhs) {
            return new FunctionCall(rhs[0], rhs[2]);
        };
        this.reduceActions[38] = function (rhs) {
            return [rhs[0]];
        };
        this.reduceActions[39] = function (rhs) {
            rhs[2].unshift(rhs[0]);
            return rhs[2];
        };
        this.reduceActions[43] = function (rhs) {
            return new LocationPath(true, []);
        };
        this.reduceActions[44] = function (rhs) {
            rhs[1].absolute = true;
            return rhs[1];
        };
        this.reduceActions[46] = function (rhs) {
            return new LocationPath(false, [rhs[0]]);
        };
        this.reduceActions[47] = function (rhs) {
            rhs[0].steps.push(rhs[2]);
            return rhs[0];
        };
        this.reduceActions[49] = function (rhs) {
            return new Step(rhs[0], rhs[1], []);
        };
        this.reduceActions[50] = function (rhs) {
            return new Step(Step.CHILD, rhs[0], []);
        };
        this.reduceActions[51] = function (rhs) {
            return new Step(rhs[0], rhs[1], rhs[2]);
        };
        this.reduceActions[52] = function (rhs) {
            return new Step(Step.CHILD, rhs[0], rhs[1]);
        };
        this.reduceActions[54] = function (rhs) {
            return [rhs[0]];
        };
        this.reduceActions[55] = function (rhs) {
            rhs[1].unshift(rhs[0]);
            return rhs[1];
        };
        this.reduceActions[56] = function (rhs) {
            if (rhs[0] == "ancestor") {
                return Step.ANCESTOR;
            } else if (rhs[0] == "ancestor-or-self") {
                return Step.ANCESTORORSELF;
            } else if (rhs[0] == "attribute") {
                return Step.ATTRIBUTE;
            } else if (rhs[0] == "child") {
                return Step.CHILD;
            } else if (rhs[0] == "descendant") {
                return Step.DESCENDANT;
            } else if (rhs[0] == "descendant-or-self") {
                return Step.DESCENDANTORSELF;
            } else if (rhs[0] == "following") {
                return Step.FOLLOWING;
            } else if (rhs[0] == "following-sibling") {
                return Step.FOLLOWINGSIBLING;
            } else if (rhs[0] == "namespace") {
                return Step.NAMESPACE;
            } else if (rhs[0] == "parent") {
                return Step.PARENT;
            } else if (rhs[0] == "preceding") {
                return Step.PRECEDING;
            } else if (rhs[0] == "preceding-sibling") {
                return Step.PRECEDINGSIBLING;
            } else if (rhs[0] == "self") {
                return Step.SELF;
            }
            return -1;
        };
        this.reduceActions[57] = function (rhs) {
            return Step.ATTRIBUTE;
        };
        this.reduceActions[59] = function (rhs) {
            if (rhs[0] == "comment") {
                return NodeTest.commentTest;
            } else if (rhs[0] == "text") {
                return NodeTest.textTest;
            } else if (rhs[0] == "processing-instruction") {
                return NodeTest.anyPiTest;
            } else if (rhs[0] == "node") {
                return NodeTest.nodeTest;
            }
            return new NodeTest(-1, undefined);
        };
        this.reduceActions[60] = function (rhs) {
            return new NodeTest.PITest(rhs[2]);
        };
        this.reduceActions[61] = function (rhs) {
            return rhs[1];
        };
        this.reduceActions[63] = function (rhs) {
            rhs[1].absolute = true;
            rhs[1].steps.unshift(new Step(Step.DESCENDANTORSELF, NodeTest.nodeTest, []));
            return rhs[1];
        };
        this.reduceActions[64] = function (rhs) {
            rhs[0].steps.push(new Step(Step.DESCENDANTORSELF, NodeTest.nodeTest, []));
            rhs[0].steps.push(rhs[2]);
            return rhs[0];
        };
        this.reduceActions[65] = function (rhs) {
            return new Step(Step.SELF, NodeTest.nodeTest, []);
        };
        this.reduceActions[66] = function (rhs) {
            return new Step(Step.PARENT, NodeTest.nodeTest, []);
        };
        this.reduceActions[67] = function (rhs) {
            return new VariableReference(rhs[1]);
        };
        this.reduceActions[68] = function (rhs) {
            return NodeTest.nameTestAny;
        };
        this.reduceActions[69] = function (rhs) {
            return new NodeTest.NameTestPrefixAny(rhs[0].split(':')[0]);
        };
        this.reduceActions[70] = function (rhs) {
            return new NodeTest.NameTestQName(rhs[0]);
        };
    };

    XPathParser.actionTable = [
        " s s        sssssssss    s ss  s  ss",
        "                 s                  ",
        "r  rrrrrrrrr         rrrrrrr rr  r  ",
        "                rrrrr               ",
        " s s        sssssssss    s ss  s  ss",
        "rs  rrrrrrrr s  sssssrrrrrr  rrs rs ",
        " s s        sssssssss    s ss  s  ss",
        "                            s       ",
        "                            s       ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "  s                                 ",
        "                            s       ",
        " s           s  sssss          s  s ",
        "r  rrrrrrrrr         rrrrrrr rr  r  ",
        "a                                   ",
        "r       s                    rr  r  ",
        "r      sr                    rr  r  ",
        "r   s  rr            s       rr  r  ",
        "r   rssrr            rss     rr  r  ",
        "r   rrrrr            rrrss   rr  r  ",
        "r   rrrrrsss         rrrrr   rr  r  ",
        "r   rrrrrrrr         rrrrr   rr  r  ",
        "r   rrrrrrrr         rrrrrs  rr  r  ",
        "r   rrrrrrrr         rrrrrr  rr  r  ",
        "r   rrrrrrrr         rrrrrr  rr  r  ",
        "r  srrrrrrrr         rrrrrrs rr sr  ",
        "r  srrrrrrrr         rrrrrrs rr  r  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "r   rrrrrrrr         rrrrrr  rr  r  ",
        "r   rrrrrrrr         rrrrrr  rr  r  ",
        "r  rrrrrrrrr         rrrrrrr rr  r  ",
        "r  rrrrrrrrr         rrrrrrr rr  r  ",
        "                sssss               ",
        "r  rrrrrrrrr         rrrrrrr rr sr  ",
        "r  rrrrrrrrr         rrrrrrr rr  r  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "                             s      ",
        "r  srrrrrrrr         rrrrrrs rr  r  ",
        "r   rrrrrrrr         rrrrr   rr  r  ",
        "              s                     ",
        "                             s      ",
        "                rrrrr               ",
        " s s        sssssssss    s sss s  ss",
        "r  srrrrrrrr         rrrrrrs rr  r  ",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s s        sssssssss      ss  s  ss",
        " s s        sssssssss    s ss  s  ss",
        " s           s  sssss          s  s ",
        " s           s  sssss          s  s ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        " s           s  sssss          s  s ",
        " s           s  sssss          s  s ",
        "r  rrrrrrrrr         rrrrrrr rr sr  ",
        "r  rrrrrrrrr         rrrrrrr rr sr  ",
        "r  rrrrrrrrr         rrrrrrr rr  r  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "                             s      ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "                             rr     ",
        "                             s      ",
        "                             rs     ",
        "r      sr                    rr  r  ",
        "r   s  rr            s       rr  r  ",
        "r   rssrr            rss     rr  r  ",
        "r   rssrr            rss     rr  r  ",
        "r   rrrrr            rrrss   rr  r  ",
        "r   rrrrr            rrrss   rr  r  ",
        "r   rrrrr            rrrss   rr  r  ",
        "r   rrrrr            rrrss   rr  r  ",
        "r   rrrrrsss         rrrrr   rr  r  ",
        "r   rrrrrsss         rrrrr   rr  r  ",
        "r   rrrrrrrr         rrrrr   rr  r  ",
        "r   rrrrrrrr         rrrrr   rr  r  ",
        "r   rrrrrrrr         rrrrr   rr  r  ",
        "r   rrrrrrrr         rrrrrr  rr  r  ",
        "                                 r  ",
        "                                 s  ",
        "r  srrrrrrrr         rrrrrrs rr  r  ",
        "r  srrrrrrrr         rrrrrrs rr  r  ",
        "r  rrrrrrrrr         rrrrrrr rr  r  ",
        "r  rrrrrrrrr         rrrrrrr rr  r  ",
        "r  rrrrrrrrr         rrrrrrr rr  r  ",
        "r  rrrrrrrrr         rrrrrrr rr  r  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        " s s        sssssssss    s ss  s  ss",
        "r  rrrrrrrrr         rrrrrrr rr rr  ",
        "                             r      "
    ];

    XPathParser.actionTableNumber = [
        " 1 0        /.-,+*)('    & %$  #  \"!",
        "                 J                  ",
        "a  aaaaaaaaa         aaaaaaa aa  a  ",
        "                YYYYY               ",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        "K1  KKKKKKKK .  +*)('KKKKKK  KK# K\" ",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        "                            N       ",
        "                            O       ",
        "e  eeeeeeeee         eeeeeee ee ee  ",
        "f  fffffffff         fffffff ff ff  ",
        "d  ddddddddd         ddddddd dd dd  ",
        "B  BBBBBBBBB         BBBBBBB BB BB  ",
        "A  AAAAAAAAA         AAAAAAA AA AA  ",
        "  P                                 ",
        "                            Q       ",
        " 1           .  +*)('          #  \" ",
        "b  bbbbbbbbb         bbbbbbb bb  b  ",
        "                                    ",
        "!       S                    !!  !  ",
        "\"      T\"                    \"\"  \"  ",
        "$   V  $$            U       $$  $  ",
        "&   &ZY&&            &XW     &&  &  ",
        ")   )))))            )))\\[   ))  )  ",
        ".   ....._^]         .....   ..  .  ",
        "1   11111111         11111   11  1  ",
        "5   55555555         55555`  55  5  ",
        "7   77777777         777777  77  7  ",
        "9   99999999         999999  99  9  ",
        ":  c::::::::         ::::::b :: a:  ",
        "I  fIIIIIIII         IIIIIIe II  I  ",
        "=  =========         ======= == ==  ",
        "?  ?????????         ??????? ?? ??  ",
        "C  CCCCCCCCC         CCCCCCC CC CC  ",
        "J   JJJJJJJJ         JJJJJJ  JJ  J  ",
        "M   MMMMMMMM         MMMMMM  MM  M  ",
        "N  NNNNNNNNN         NNNNNNN NN  N  ",
        "P  PPPPPPPPP         PPPPPPP PP  P  ",
        "                +*)('               ",
        "R  RRRRRRRRR         RRRRRRR RR aR  ",
        "U  UUUUUUUUU         UUUUUUU UU  U  ",
        "Z  ZZZZZZZZZ         ZZZZZZZ ZZ ZZ  ",
        "c  ccccccccc         ccccccc cc cc  ",
        "                             j      ",
        "L  fLLLLLLLL         LLLLLLe LL  L  ",
        "6   66666666         66666   66  6  ",
        "              k                     ",
        "                             l      ",
        "                XXXXX               ",
        " 1 0        /.-,+*)('    & %$m #  \"!",
        "_  f________         ______e __  _  ",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1 0        /.-,+*)('      %$  #  \"!",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        " 1           .  +*)('          #  \" ",
        " 1           .  +*)('          #  \" ",
        ">  >>>>>>>>>         >>>>>>> >> >>  ",
        " 1           .  +*)('          #  \" ",
        " 1           .  +*)('          #  \" ",
        "Q  QQQQQQQQQ         QQQQQQQ QQ aQ  ",
        "V  VVVVVVVVV         VVVVVVV VV aV  ",
        "T  TTTTTTTTT         TTTTTTT TT  T  ",
        "@  @@@@@@@@@         @@@@@@@ @@ @@  ",
        "                             \x87      ",
        "[  [[[[[[[[[         [[[[[[[ [[ [[  ",
        "D  DDDDDDDDD         DDDDDDD DD DD  ",
        "                             HH     ",
        "                             \x88      ",
        "                             F\x89     ",
        "#      T#                    ##  #  ",
        "%   V  %%            U       %%  %  ",
        "'   'ZY''            'XW     ''  '  ",
        "(   (ZY((            (XW     ((  (  ",
        "+   +++++            +++\\[   ++  +  ",
        "*   *****            ***\\[   **  *  ",
        "-   -----            ---\\[   --  -  ",
        ",   ,,,,,            ,,,\\[   ,,  ,  ",
        "0   00000_^]         00000   00  0  ",
        "/   /////_^]         /////   //  /  ",
        "2   22222222         22222   22  2  ",
        "3   33333333         33333   33  3  ",
        "4   44444444         44444   44  4  ",
        "8   88888888         888888  88  8  ",
        "                                 ^  ",
        "                                 \x8a  ",
        ";  f;;;;;;;;         ;;;;;;e ;;  ;  ",
        "<  f<<<<<<<<         <<<<<<e <<  <  ",
        "O  OOOOOOOOO         OOOOOOO OO  O  ",
        "`  `````````         ``````` ``  `  ",
        "S  SSSSSSSSS         SSSSSSS SS  S  ",
        "W  WWWWWWWWW         WWWWWWW WW  W  ",
        "\\  \\\\\\\\\\\\\\\\\\         \\\\\\\\\\\\\\ \\\\ \\\\  ",
        "E  EEEEEEEEE         EEEEEEE EE EE  ",
        " 1 0        /.-,+*)('    & %$  #  \"!",
        "]  ]]]]]]]]]         ]]]]]]] ]] ]]  ",
        "                             G      "
    ];

    XPathParser.gotoTable = [
        "3456789:;<=>?@ AB  CDEFGH IJ ",
        "                             ",
        "                             ",
        "                             ",
        "L456789:;<=>?@ AB  CDEFGH IJ ",
        "            M        EFGH IJ ",
        "       N;<=>?@ AB  CDEFGH IJ ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "            S        EFGH IJ ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "              e              ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                        h  J ",
        "              i          j   ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "o456789:;<=>?@ ABpqCDEFGH IJ ",
        "                             ",
        "  r6789:;<=>?@ AB  CDEFGH IJ ",
        "   s789:;<=>?@ AB  CDEFGH IJ ",
        "    t89:;<=>?@ AB  CDEFGH IJ ",
        "    u89:;<=>?@ AB  CDEFGH IJ ",
        "     v9:;<=>?@ AB  CDEFGH IJ ",
        "     w9:;<=>?@ AB  CDEFGH IJ ",
        "     x9:;<=>?@ AB  CDEFGH IJ ",
        "     y9:;<=>?@ AB  CDEFGH IJ ",
        "      z:;<=>?@ AB  CDEFGH IJ ",
        "      {:;<=>?@ AB  CDEFGH IJ ",
        "       |;<=>?@ AB  CDEFGH IJ ",
        "       };<=>?@ AB  CDEFGH IJ ",
        "       ~;<=>?@ AB  CDEFGH IJ ",
        "         \x7f=>?@ AB  CDEFGH IJ ",
        "\x80456789:;<=>?@ AB  CDEFGH IJ\x81",
        "            \x82        EFGH IJ ",
        "            \x83        EFGH IJ ",
        "                             ",
        "                     \x84 GH IJ ",
        "                     \x85 GH IJ ",
        "              i          \x86   ",
        "              i          \x87   ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "                             ",
        "o456789:;<=>?@ AB\x8cqCDEFGH IJ ",
        "                             ",
        "                             "
    ];

    XPathParser.productions = [
        [1, 1, 2],
        [2, 1, 3],
        [3, 1, 4],
        [3, 3, 3, -9, 4],
        [4, 1, 5],
        [4, 3, 4, -8, 5],
        [5, 1, 6],
        [5, 3, 5, -22, 6],
        [5, 3, 5, -5, 6],
        [6, 1, 7],
        [6, 3, 6, -23, 7],
        [6, 3, 6, -24, 7],
        [6, 3, 6, -6, 7],
        [6, 3, 6, -7, 7],
        [7, 1, 8],
        [7, 3, 7, -25, 8],
        [7, 3, 7, -26, 8],
        [8, 1, 9],
        [8, 3, 8, -12, 9],
        [8, 3, 8, -11, 9],
        [8, 3, 8, -10, 9],
        [9, 1, 10],
        [9, 2, -26, 9],
        [10, 1, 11],
        [10, 3, 10, -27, 11],
        [11, 1, 12],
        [11, 1, 13],
        [11, 3, 13, -28, 14],
        [11, 3, 13, -4, 14],
        [13, 1, 15],
        [13, 2, 13, 16],
        [15, 1, 17],
        [15, 3, -29, 2, -30],
        [15, 1, -15],
        [15, 1, -16],
        [15, 1, 18],
        [18, 3, -13, -29, -30],
        [18, 4, -13, -29, 19, -30],
        [19, 1, 20],
        [19, 3, 20, -31, 19],
        [20, 1, 2],
        [12, 1, 14],
        [12, 1, 21],
        [21, 1, -28],
        [21, 2, -28, 14],
        [21, 1, 22],
        [14, 1, 23],
        [14, 3, 14, -28, 23],
        [14, 1, 24],
        [23, 2, 25, 26],
        [23, 1, 26],
        [23, 3, 25, 26, 27],
        [23, 2, 26, 27],
        [23, 1, 28],
        [27, 1, 16],
        [27, 2, 16, 27],
        [25, 2, -14, -3],
        [25, 1, -32],
        [26, 1, 29],
        [26, 3, -20, -29, -30],
        [26, 4, -21, -29, -15, -30],
        [16, 3, -33, 30, -34],
        [30, 1, 2],
        [22, 2, -4, 14],
        [24, 3, 14, -4, 23],
        [28, 1, -35],
        [28, 1, -2],
        [17, 2, -36, -18],
        [29, 1, -17],
        [29, 1, -19],
        [29, 1, -18]
    ];

    XPathParser.DOUBLEDOT = 2;
    XPathParser.DOUBLECOLON = 3;
    XPathParser.DOUBLESLASH = 4;
    XPathParser.NOTEQUAL = 5;
    XPathParser.LESSTHANOREQUAL = 6;
    XPathParser.GREATERTHANOREQUAL = 7;
    XPathParser.AND = 8;
    XPathParser.OR = 9;
    XPathParser.MOD = 10;
    XPathParser.DIV = 11;
    XPathParser.MULTIPLYOPERATOR = 12;
    XPathParser.FUNCTIONNAME = 13;
    XPathParser.AXISNAME = 14;
    XPathParser.LITERAL = 15;
    XPathParser.NUMBER = 16;
    XPathParser.ASTERISKNAMETEST = 17;
    XPathParser.QNAME = 18;
    XPathParser.NCNAMECOLONASTERISK = 19;
    XPathParser.NODETYPE = 20;
    XPathParser.PROCESSINGINSTRUCTIONWITHLITERAL = 21;
    XPathParser.EQUALS = 22;
    XPathParser.LESSTHAN = 23;
    XPathParser.GREATERTHAN = 24;
    XPathParser.PLUS = 25;
    XPathParser.MINUS = 26;
    XPathParser.BAR = 27;
    XPathParser.SLASH = 28;
    XPathParser.LEFTPARENTHESIS = 29;
    XPathParser.RIGHTPARENTHESIS = 30;
    XPathParser.COMMA = 31;
    XPathParser.AT = 32;
    XPathParser.LEFTBRACKET = 33;
    XPathParser.RIGHTBRACKET = 34;
    XPathParser.DOT = 35;
    XPathParser.DOLLAR = 36;

    XPathParser.prototype.tokenize = function (s1) {
        var types = [];
        var values = [];
        var s = s1 + '\0';

        var pos = 0;
        var c = s.charAt(pos++);
        while (1) {
            while (c == ' ' || c == '\t' || c == '\r' || c == '\n') {
                c = s.charAt(pos++);
            }
            if (c == '\0' || pos >= s.length) {
                break;
            }

            if (c == '(') {
                types.push(XPathParser.LEFTPARENTHESIS);
                values.push(c);
                c = s.charAt(pos++);
                continue;
            }
            if (c == ')') {
                types.push(XPathParser.RIGHTPARENTHESIS);
                values.push(c);
                c = s.charAt(pos++);
                continue;
            }
            if (c == '[') {
                types.push(XPathParser.LEFTBRACKET);
                values.push(c);
                c = s.charAt(pos++);
                continue;
            }
            if (c == ']') {
                types.push(XPathParser.RIGHTBRACKET);
                values.push(c);
                c = s.charAt(pos++);
                continue;
            }
            if (c == '@') {
                types.push(XPathParser.AT);
                values.push(c);
                c = s.charAt(pos++);
                continue;
            }
            if (c == ',') {
                types.push(XPathParser.COMMA);
                values.push(c);
                c = s.charAt(pos++);
                continue;
            }
            if (c == '|') {
                types.push(XPathParser.BAR);
                values.push(c);
                c = s.charAt(pos++);
                continue;
            }
            if (c == '+') {
                types.push(XPathParser.PLUS);
                values.push(c);
                c = s.charAt(pos++);
                continue;
            }
            if (c == '-') {
                types.push(XPathParser.MINUS);
                values.push(c);
                c = s.charAt(pos++);
                continue;
            }
            if (c == '=') {
                types.push(XPathParser.EQUALS);
                values.push(c);
                c = s.charAt(pos++);
                continue;
            }
            if (c == '$') {
                types.push(XPathParser.DOLLAR);
                values.push(c);
                c = s.charAt(pos++);
                continue;
            }

            if (c == '.') {
                c = s.charAt(pos++);
                if (c == '.') {
                    types.push(XPathParser.DOUBLEDOT);
                    values.push("..");
                    c = s.charAt(pos++);
                    continue;
                }
                if (c >= '0' && c <= '9') {
                    var number = "." + c;
                    c = s.charAt(pos++);
                    while (c >= '0' && c <= '9') {
                        number += c;
                        c = s.charAt(pos++);
                    }
                    types.push(XPathParser.NUMBER);
                    values.push(number);
                    continue;
                }
                types.push(XPathParser.DOT);
                values.push('.');
                continue;
            }

            if (c == '\'' || c == '"') {
                var delimiter = c;
                var literal = "";
                while (pos < s.length && (c = s.charAt(pos)) !== delimiter) {
                    literal += c;
                    pos += 1;
                }
                if (c !== delimiter) {
                    throw XPathException.fromMessage("Unterminated string literal: " + delimiter + literal);
                }
                pos += 1;
                types.push(XPathParser.LITERAL);
                values.push(literal);
                c = s.charAt(pos++);
                continue;
            }

            if (c >= '0' && c <= '9') {
                var number = c;
                c = s.charAt(pos++);
                while (c >= '0' && c <= '9') {
                    number += c;
                    c = s.charAt(pos++);
                }
                if (c == '.') {
                    if (s.charAt(pos) >= '0' && s.charAt(pos) <= '9') {
                        number += c;
                        number += s.charAt(pos++);
                        c = s.charAt(pos++);
                        while (c >= '0' && c <= '9') {
                            number += c;
                            c = s.charAt(pos++);
                        }
                    }
                }
                types.push(XPathParser.NUMBER);
                values.push(number);
                continue;
            }

            if (c == '*') {
                if (types.length > 0) {
                    var last = types[types.length - 1];
                    if (last != XPathParser.AT
                        && last != XPathParser.DOUBLECOLON
                        && last != XPathParser.LEFTPARENTHESIS
                        && last != XPathParser.LEFTBRACKET
                        && last != XPathParser.AND
                        && last != XPathParser.OR
                        && last != XPathParser.MOD
                        && last != XPathParser.DIV
                        && last != XPathParser.MULTIPLYOPERATOR
                        && last != XPathParser.SLASH
                        && last != XPathParser.DOUBLESLASH
                        && last != XPathParser.BAR
                        && last != XPathParser.PLUS
                        && last != XPathParser.MINUS
                        && last != XPathParser.EQUALS
                        && last != XPathParser.NOTEQUAL
                        && last != XPathParser.LESSTHAN
                        && last != XPathParser.LESSTHANOREQUAL
                        && last != XPathParser.GREATERTHAN
                        && last != XPathParser.GREATERTHANOREQUAL) {
                        types.push(XPathParser.MULTIPLYOPERATOR);
                        values.push(c);
                        c = s.charAt(pos++);
                        continue;
                    }
                }
                types.push(XPathParser.ASTERISKNAMETEST);
                values.push(c);
                c = s.charAt(pos++);
                continue;
            }

            if (c == ':') {
                if (s.charAt(pos) == ':') {
                    types.push(XPathParser.DOUBLECOLON);
                    values.push("::");
                    pos++;
                    c = s.charAt(pos++);
                    continue;
                }
            }

            if (c == '/') {
                c = s.charAt(pos++);
                if (c == '/') {
                    types.push(XPathParser.DOUBLESLASH);
                    values.push("//");
                    c = s.charAt(pos++);
                    continue;
                }
                types.push(XPathParser.SLASH);
                values.push('/');
                continue;
            }

            if (c == '!') {
                if (s.charAt(pos) == '=') {
                    types.push(XPathParser.NOTEQUAL);
                    values.push("!=");
                    pos++;
                    c = s.charAt(pos++);
                    continue;
                }
            }

            if (c == '<') {
                if (s.charAt(pos) == '=') {
                    types.push(XPathParser.LESSTHANOREQUAL);
                    values.push("<=");
                    pos++;
                    c = s.charAt(pos++);
                    continue;
                }
                types.push(XPathParser.LESSTHAN);
                values.push('<');
                c = s.charAt(pos++);
                continue;
            }

            if (c == '>') {
                if (s.charAt(pos) == '=') {
                    types.push(XPathParser.GREATERTHANOREQUAL);
                    values.push(">=");
                    pos++;
                    c = s.charAt(pos++);
                    continue;
                }
                types.push(XPathParser.GREATERTHAN);
                values.push('>');
                c = s.charAt(pos++);
                continue;
            }

            if (c == '_' || Utilities.isLetter(c.charCodeAt(0))) {
                var name = c;
                c = s.charAt(pos++);
                while (Utilities.isNCNameChar(c.charCodeAt(0))) {
                    name += c;
                    c = s.charAt(pos++);
                }
                if (types.length > 0) {
                    var last = types[types.length - 1];
                    if (last != XPathParser.AT
                        && last != XPathParser.DOUBLECOLON
                        && last != XPathParser.LEFTPARENTHESIS
                        && last != XPathParser.LEFTBRACKET
                        && last != XPathParser.AND
                        && last != XPathParser.OR
                        && last != XPathParser.MOD
                        && last != XPathParser.DIV
                        && last != XPathParser.MULTIPLYOPERATOR
                        && last != XPathParser.SLASH
                        && last != XPathParser.DOUBLESLASH
                        && last != XPathParser.BAR
                        && last != XPathParser.PLUS
                        && last != XPathParser.MINUS
                        && last != XPathParser.EQUALS
                        && last != XPathParser.NOTEQUAL
                        && last != XPathParser.LESSTHAN
                        && last != XPathParser.LESSTHANOREQUAL
                        && last != XPathParser.GREATERTHAN
                        && last != XPathParser.GREATERTHANOREQUAL) {
                        if (name == "and") {
                            types.push(XPathParser.AND);
                            values.push(name);
                            continue;
                        }
                        if (name == "or") {
                            types.push(XPathParser.OR);
                            values.push(name);
                            continue;
                        }
                        if (name == "mod") {
                            types.push(XPathParser.MOD);
                            values.push(name);
                            continue;
                        }
                        if (name == "div") {
                            types.push(XPathParser.DIV);
                            values.push(name);
                            continue;
                        }
                    }
                }
                if (c == ':') {
                    if (s.charAt(pos) == '*') {
                        types.push(XPathParser.NCNAMECOLONASTERISK);
                        values.push(name + ":*");
                        pos++;
                        c = s.charAt(pos++);
                        continue;
                    }
                    if (s.charAt(pos) == '_' || Utilities.isLetter(s.charCodeAt(pos))) {
                        name += ':';
                        c = s.charAt(pos++);
                        while (Utilities.isNCNameChar(c.charCodeAt(0))) {
                            name += c;
                            c = s.charAt(pos++);
                        }
                        if (c == '(') {
                            types.push(XPathParser.FUNCTIONNAME);
                            values.push(name);
                            continue;
                        }
                        types.push(XPathParser.QNAME);
                        values.push(name);
                        continue;
                    }
                    if (s.charAt(pos) == ':') {
                        types.push(XPathParser.AXISNAME);
                        values.push(name);
                        continue;
                    }
                }
                if (c == '(') {
                    if (name == "comment" || name == "text" || name == "node") {
                        types.push(XPathParser.NODETYPE);
                        values.push(name);
                        continue;
                    }
                    if (name == "processing-instruction") {
                        if (s.charAt(pos) == ')') {
                            types.push(XPathParser.NODETYPE);
                        } else {
                            types.push(XPathParser.PROCESSINGINSTRUCTIONWITHLITERAL);
                        }
                        values.push(name);
                        continue;
                    }
                    types.push(XPathParser.FUNCTIONNAME);
                    values.push(name);
                    continue;
                }
                types.push(XPathParser.QNAME);
                values.push(name);
                continue;
            }

            throw new Error("Unexpected character " + c);
        }
        types.push(1);
        values.push("[EOF]");
        return [types, values];
    };

    XPathParser.SHIFT = 's';
    XPathParser.REDUCE = 'r';
    XPathParser.ACCEPT = 'a';

    XPathParser.prototype.parse = function (s) {
        var types;
        var values;
        var res = this.tokenize(s);
        if (res == undefined) {
            return undefined;
        }
        types = res[0];
        values = res[1];
        var tokenPos = 0;
        var state = [];
        var tokenType = [];
        var tokenValue = [];
        var s;
        var a;
        var t;

        state.push(0);
        tokenType.push(1);
        tokenValue.push("_S");

        a = types[tokenPos];
        t = values[tokenPos++];
        while (1) {
            s = state[state.length - 1];
            switch (XPathParser.actionTable[s].charAt(a - 1)) {
                case XPathParser.SHIFT:
                    tokenType.push(-a);
                    tokenValue.push(t);
                    state.push(XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32);
                    a = types[tokenPos];
                    t = values[tokenPos++];
                    break;
                case XPathParser.REDUCE:
                    var num = XPathParser.productions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32][1];
                    var rhs = [];
                    for (var i = 0; i < num; i++) {
                        tokenType.pop();
                        rhs.unshift(tokenValue.pop());
                        state.pop();
                    }
                    var s_ = state[state.length - 1];
                    tokenType.push(XPathParser.productions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32][0]);
                    if (this.reduceActions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32] == undefined) {
                        tokenValue.push(rhs[0]);
                    } else {
                        tokenValue.push(this.reduceActions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32](rhs));
                    }
                    state.push(XPathParser.gotoTable[s_].charCodeAt(XPathParser.productions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32][0] - 2) - 33);
                    break;
                case XPathParser.ACCEPT:
                    return new XPath(tokenValue.pop());
                default:
                    throw new Error("XPath parse error");
            }
        }
    };

    // XPath /////////////////////////////////////////////////////////////////////

    XPath.prototype = new Object();
    XPath.prototype.constructor = XPath;
    XPath.superclass = Object.prototype;

    function XPath(e) {
        this.expression = e;
    }

    XPath.prototype.toString = function () {
        return this.expression.toString();
    };

    function setIfUnset(obj, prop, value) {
        if (!(prop in obj)) {
            obj[prop] = value;
        }
    }

    XPath.prototype.evaluate = function (c) {
        c.contextNode = c.expressionContextNode;
        c.contextSize = 1;
        c.contextPosition = 1;

        // [2017-11-25] Removed usage of .implementation.hasFeature() since it does
        //              not reliably detect HTML DOMs (always returns false in xmldom and true in browsers)
        if (c.isHtml) {
            setIfUnset(c, 'caseInsensitive', true);
            setIfUnset(c, 'allowAnyNamespaceForNoPrefix', true);
        }

        setIfUnset(c, 'caseInsensitive', false);

        return this.expression.evaluate(c);
    };

    XPath.XML_NAMESPACE_URI = "http://www.w3.org/XML/1998/namespace";
    XPath.XMLNS_NAMESPACE_URI = "http://www.w3.org/2000/xmlns/";

    // Expression ////////////////////////////////////////////////////////////////

    Expression.prototype = new Object();
    Expression.prototype.constructor = Expression;
    Expression.superclass = Object.prototype;

    function Expression() {
    }

    Expression.prototype.init = function () {
    };

    Expression.prototype.toString = function () {
        return "<Expression>";
    };

    Expression.prototype.evaluate = function (c) {
        throw new Error("Could not evaluate expression.");
    };

    // UnaryOperation ////////////////////////////////////////////////////////////

    UnaryOperation.prototype = new Expression();
    UnaryOperation.prototype.constructor = UnaryOperation;
    UnaryOperation.superclass = Expression.prototype;

    function UnaryOperation(rhs) {
        if (arguments.length > 0) {
            this.init(rhs);
        }
    }

    UnaryOperation.prototype.init = function (rhs) {
        this.rhs = rhs;
    };

    // UnaryMinusOperation ///////////////////////////////////////////////////////

    UnaryMinusOperation.prototype = new UnaryOperation();
    UnaryMinusOperation.prototype.constructor = UnaryMinusOperation;
    UnaryMinusOperation.superclass = UnaryOperation.prototype;

    function UnaryMinusOperation(rhs) {
        if (arguments.length > 0) {
            this.init(rhs);
        }
    }

    UnaryMinusOperation.prototype.init = function (rhs) {
        UnaryMinusOperation.superclass.init.call(this, rhs);
    };

    UnaryMinusOperation.prototype.evaluate = function (c) {
        return this.rhs.evaluate(c).number().negate();
    };

    UnaryMinusOperation.prototype.toString = function () {
        return "-" + this.rhs.toString();
    };

    // BinaryOperation ///////////////////////////////////////////////////////////

    BinaryOperation.prototype = new Expression();
    BinaryOperation.prototype.constructor = BinaryOperation;
    BinaryOperation.superclass = Expression.prototype;

    function BinaryOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    BinaryOperation.prototype.init = function (lhs, rhs) {
        this.lhs = lhs;
        this.rhs = rhs;
    };

    // OrOperation ///////////////////////////////////////////////////////////////

    OrOperation.prototype = new BinaryOperation();
    OrOperation.prototype.constructor = OrOperation;
    OrOperation.superclass = BinaryOperation.prototype;

    function OrOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    OrOperation.prototype.init = function (lhs, rhs) {
        OrOperation.superclass.init.call(this, lhs, rhs);
    };

    OrOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " or " + this.rhs.toString() + ")";
    };

    OrOperation.prototype.evaluate = function (c) {
        var b = this.lhs.evaluate(c).bool();
        if (b.booleanValue()) {
            return b;
        }
        return this.rhs.evaluate(c).bool();
    };

    // AndOperation //////////////////////////////////////////////////////////////

    AndOperation.prototype = new BinaryOperation();
    AndOperation.prototype.constructor = AndOperation;
    AndOperation.superclass = BinaryOperation.prototype;

    function AndOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    AndOperation.prototype.init = function (lhs, rhs) {
        AndOperation.superclass.init.call(this, lhs, rhs);
    };

    AndOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " and " + this.rhs.toString() + ")";
    };

    AndOperation.prototype.evaluate = function (c) {
        var b = this.lhs.evaluate(c).bool();
        if (!b.booleanValue()) {
            return b;
        }
        return this.rhs.evaluate(c).bool();
    };

    // EqualsOperation ///////////////////////////////////////////////////////////

    EqualsOperation.prototype = new BinaryOperation();
    EqualsOperation.prototype.constructor = EqualsOperation;
    EqualsOperation.superclass = BinaryOperation.prototype;

    function EqualsOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    EqualsOperation.prototype.init = function (lhs, rhs) {
        EqualsOperation.superclass.init.call(this, lhs, rhs);
    };

    EqualsOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " = " + this.rhs.toString() + ")";
    };

    EqualsOperation.prototype.evaluate = function (c) {
        return this.lhs.evaluate(c).equals(this.rhs.evaluate(c));
    };

    // NotEqualOperation /////////////////////////////////////////////////////////

    NotEqualOperation.prototype = new BinaryOperation();
    NotEqualOperation.prototype.constructor = NotEqualOperation;
    NotEqualOperation.superclass = BinaryOperation.prototype;

    function NotEqualOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    NotEqualOperation.prototype.init = function (lhs, rhs) {
        NotEqualOperation.superclass.init.call(this, lhs, rhs);
    };

    NotEqualOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " != " + this.rhs.toString() + ")";
    };

    NotEqualOperation.prototype.evaluate = function (c) {
        return this.lhs.evaluate(c).notequal(this.rhs.evaluate(c));
    };

    // LessThanOperation /////////////////////////////////////////////////////////

    LessThanOperation.prototype = new BinaryOperation();
    LessThanOperation.prototype.constructor = LessThanOperation;
    LessThanOperation.superclass = BinaryOperation.prototype;

    function LessThanOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    LessThanOperation.prototype.init = function (lhs, rhs) {
        LessThanOperation.superclass.init.call(this, lhs, rhs);
    };

    LessThanOperation.prototype.evaluate = function (c) {
        return this.lhs.evaluate(c).lessthan(this.rhs.evaluate(c));
    };

    LessThanOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " < " + this.rhs.toString() + ")";
    };

    // GreaterThanOperation //////////////////////////////////////////////////////

    GreaterThanOperation.prototype = new BinaryOperation();
    GreaterThanOperation.prototype.constructor = GreaterThanOperation;
    GreaterThanOperation.superclass = BinaryOperation.prototype;

    function GreaterThanOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    GreaterThanOperation.prototype.init = function (lhs, rhs) {
        GreaterThanOperation.superclass.init.call(this, lhs, rhs);
    };

    GreaterThanOperation.prototype.evaluate = function (c) {
        return this.lhs.evaluate(c).greaterthan(this.rhs.evaluate(c));
    };

    GreaterThanOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " > " + this.rhs.toString() + ")";
    };

    // LessThanOrEqualOperation //////////////////////////////////////////////////

    LessThanOrEqualOperation.prototype = new BinaryOperation();
    LessThanOrEqualOperation.prototype.constructor = LessThanOrEqualOperation;
    LessThanOrEqualOperation.superclass = BinaryOperation.prototype;

    function LessThanOrEqualOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    LessThanOrEqualOperation.prototype.init = function (lhs, rhs) {
        LessThanOrEqualOperation.superclass.init.call(this, lhs, rhs);
    };

    LessThanOrEqualOperation.prototype.evaluate = function (c) {
        return this.lhs.evaluate(c).lessthanorequal(this.rhs.evaluate(c));
    };

    LessThanOrEqualOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " <= " + this.rhs.toString() + ")";
    };

    // GreaterThanOrEqualOperation ///////////////////////////////////////////////

    GreaterThanOrEqualOperation.prototype = new BinaryOperation();
    GreaterThanOrEqualOperation.prototype.constructor = GreaterThanOrEqualOperation;
    GreaterThanOrEqualOperation.superclass = BinaryOperation.prototype;

    function GreaterThanOrEqualOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    GreaterThanOrEqualOperation.prototype.init = function (lhs, rhs) {
        GreaterThanOrEqualOperation.superclass.init.call(this, lhs, rhs);
    };

    GreaterThanOrEqualOperation.prototype.evaluate = function (c) {
        return this.lhs.evaluate(c).greaterthanorequal(this.rhs.evaluate(c));
    };

    GreaterThanOrEqualOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " >= " + this.rhs.toString() + ")";
    };

    // PlusOperation /////////////////////////////////////////////////////////////

    PlusOperation.prototype = new BinaryOperation();
    PlusOperation.prototype.constructor = PlusOperation;
    PlusOperation.superclass = BinaryOperation.prototype;

    function PlusOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    PlusOperation.prototype.init = function (lhs, rhs) {
        PlusOperation.superclass.init.call(this, lhs, rhs);
    };

    PlusOperation.prototype.evaluate = function (c) {
        return this.lhs.evaluate(c).number().plus(this.rhs.evaluate(c).number());
    };

    PlusOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " + " + this.rhs.toString() + ")";
    };

    // MinusOperation ////////////////////////////////////////////////////////////

    MinusOperation.prototype = new BinaryOperation();
    MinusOperation.prototype.constructor = MinusOperation;
    MinusOperation.superclass = BinaryOperation.prototype;

    function MinusOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    MinusOperation.prototype.init = function (lhs, rhs) {
        MinusOperation.superclass.init.call(this, lhs, rhs);
    };

    MinusOperation.prototype.evaluate = function (c) {
        return this.lhs.evaluate(c).number().minus(this.rhs.evaluate(c).number());
    };

    MinusOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " - " + this.rhs.toString() + ")";
    };

    // MultiplyOperation /////////////////////////////////////////////////////////

    MultiplyOperation.prototype = new BinaryOperation();
    MultiplyOperation.prototype.constructor = MultiplyOperation;
    MultiplyOperation.superclass = BinaryOperation.prototype;

    function MultiplyOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    MultiplyOperation.prototype.init = function (lhs, rhs) {
        MultiplyOperation.superclass.init.call(this, lhs, rhs);
    };

    MultiplyOperation.prototype.evaluate = function (c) {
        return this.lhs.evaluate(c).number().multiply(this.rhs.evaluate(c).number());
    };

    MultiplyOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " * " + this.rhs.toString() + ")";
    };

    // DivOperation //////////////////////////////////////////////////////////////

    DivOperation.prototype = new BinaryOperation();
    DivOperation.prototype.constructor = DivOperation;
    DivOperation.superclass = BinaryOperation.prototype;

    function DivOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    DivOperation.prototype.init = function (lhs, rhs) {
        DivOperation.superclass.init.call(this, lhs, rhs);
    };

    DivOperation.prototype.evaluate = function (c) {
        return this.lhs.evaluate(c).number().div(this.rhs.evaluate(c).number());
    };

    DivOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " div " + this.rhs.toString() + ")";
    };

    // ModOperation //////////////////////////////////////////////////////////////

    ModOperation.prototype = new BinaryOperation();
    ModOperation.prototype.constructor = ModOperation;
    ModOperation.superclass = BinaryOperation.prototype;

    function ModOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    ModOperation.prototype.init = function (lhs, rhs) {
        ModOperation.superclass.init.call(this, lhs, rhs);
    };

    ModOperation.prototype.evaluate = function (c) {
        return this.lhs.evaluate(c).number().mod(this.rhs.evaluate(c).number());
    };

    ModOperation.prototype.toString = function () {
        return "(" + this.lhs.toString() + " mod " + this.rhs.toString() + ")";
    };

    // BarOperation //////////////////////////////////////////////////////////////

    BarOperation.prototype = new BinaryOperation();
    BarOperation.prototype.constructor = BarOperation;
    BarOperation.superclass = BinaryOperation.prototype;

    function BarOperation(lhs, rhs) {
        if (arguments.length > 0) {
            this.init(lhs, rhs);
        }
    }

    BarOperation.prototype.init = function (lhs, rhs) {
        BarOperation.superclass.init.call(this, lhs, rhs);
    };

    BarOperation.prototype.evaluate = function (c) {
        return this.lhs.evaluate(c).nodeset().union(this.rhs.evaluate(c).nodeset());
    };

    BarOperation.prototype.toString = function () {
        return map(toString, [this.lhs, this.rhs]).join(' | ');
    };

    // PathExpr //////////////////////////////////////////////////////////////////

    PathExpr.prototype = new Expression();
    PathExpr.prototype.constructor = PathExpr;
    PathExpr.superclass = Expression.prototype;

    function PathExpr(filter, filterPreds, locpath) {
        if (arguments.length > 0) {
            this.init(filter, filterPreds, locpath);
        }
    }

    PathExpr.prototype.init = function (filter, filterPreds, locpath) {
        PathExpr.superclass.init.call(this);
        this.filter = filter;
        this.filterPredicates = filterPreds;
        this.locationPath = locpath;
    };

    /**
     * Returns the topmost node of the tree containing node
     */
    function findRoot(node) {
        while (node && node.parentNode) {
            node = node.parentNode;
        }

        return node;
    }

    PathExpr.applyPredicates = function (predicates, c, nodes) {
        if (predicates.length === 0) {
            return nodes;
        }

        var ctx = c.extend({});

        return reduce(
            function (inNodes, pred) {
                ctx.contextSize = inNodes.length;

                return filter(
                    function (node, i) {
                        ctx.contextNode = node;
                        ctx.contextPosition = i + 1;

                        return PathExpr.predicateMatches(pred, ctx);
                    },
                    inNodes
                );
            },
            nodes,
            predicates
        );
    };

    PathExpr.getRoot = function (xpc, nodes) {
        var firstNode = nodes[0];

        if (firstNode.nodeType === 9 /*Node.DOCUMENT_NODE*/) {
            return firstNode;
        }

        if (xpc.virtualRoot) {
            return xpc.virtualRoot;
        }

        var ownerDoc = firstNode.ownerDocument;

        if (ownerDoc) {
            return ownerDoc;
        }

        // IE 5.5 doesn't have ownerDocument?
        var n = firstNode;
        while (n.parentNode != null) {
            n = n.parentNode;
        }
        return n;
    }

    PathExpr.applyStep = function (step, xpc, node) {
        var self = this;
        var newNodes = [];
        xpc.contextNode = node;

        switch (step.axis) {
            case Step.ANCESTOR:
                // look at all the ancestor nodes
                if (xpc.contextNode === xpc.virtualRoot) {
                    break;
                }
                var m;
                if (xpc.contextNode.nodeType == 2 /*Node.ATTRIBUTE_NODE*/) {
                    m = PathExpr.getOwnerElement(xpc.contextNode);
                } else {
                    m = xpc.contextNode.parentNode;
                }
                while (m != null) {
                    if (step.nodeTest.matches(m, xpc)) {
                        newNodes.push(m);
                    }
                    if (m === xpc.virtualRoot) {
                        break;
                    }
                    m = m.parentNode;
                }
                break;

            case Step.ANCESTORORSELF:
                // look at all the ancestor nodes and the current node
                for (var m = xpc.contextNode; m != null; m = m.nodeType == 2 /*Node.ATTRIBUTE_NODE*/ ? PathExpr.getOwnerElement(m) : m.parentNode) {
                    if (step.nodeTest.matches(m, xpc)) {
                        newNodes.push(m);
                    }
                    if (m === xpc.virtualRoot) {
                        break;
                    }
                }
                break;

            case Step.ATTRIBUTE:
                // look at the attributes
                var nnm = xpc.contextNode.attributes;
                if (nnm != null) {
                    for (var k = 0; k < nnm.length; k++) {
                        var m = nnm.item(k);
                        if (step.nodeTest.matches(m, xpc)) {
                            newNodes.push(m);
                        }
                    }
                }
                break;

            case Step.CHILD:
                // look at all child elements
                for (var m = xpc.contextNode.firstChild; m != null; m = m.nextSibling) {
                    if (step.nodeTest.matches(m, xpc)) {
                        newNodes.push(m);
                    }
                }
                break;

            case Step.DESCENDANT:
                // look at all descendant nodes
                var st = [xpc.contextNode.firstChild];
                while (st.length > 0) {
                    for (var m = st.pop(); m != null;) {
                        if (step.nodeTest.matches(m, xpc)) {
                            newNodes.push(m);
                        }
                        if (m.firstChild != null) {
                            st.push(m.nextSibling);
                            m = m.firstChild;
                        } else {
                            m = m.nextSibling;
                        }
                    }
                }
                break;

            case Step.DESCENDANTORSELF:
                // look at self
                if (step.nodeTest.matches(xpc.contextNode, xpc)) {
                    newNodes.push(xpc.contextNode);
                }
                // look at all descendant nodes
                var st = [xpc.contextNode.firstChild];
                while (st.length > 0) {
                    for (var m = st.pop(); m != null;) {
                        if (step.nodeTest.matches(m, xpc)) {
                            newNodes.push(m);
                        }
                        if (m.firstChild != null) {
                            st.push(m.nextSibling);
                            m = m.firstChild;
                        } else {
                            m = m.nextSibling;
                        }
                    }
                }
                break;

            case Step.FOLLOWING:
                if (xpc.contextNode === xpc.virtualRoot) {
                    break;
                }
                var st = [];
                if (xpc.contextNode.firstChild != null) {
                    st.unshift(xpc.contextNode.firstChild);
                } else {
                    st.unshift(xpc.contextNode.nextSibling);
                }
                for (var m = xpc.contextNode.parentNode; m != null && m.nodeType != 9 /*Node.DOCUMENT_NODE*/ && m !== xpc.virtualRoot; m = m.parentNode) {
                    st.unshift(m.nextSibling);
                }
                do {
                    for (var m = st.pop(); m != null;) {
                        if (step.nodeTest.matches(m, xpc)) {
                            newNodes.push(m);
                        }
                        if (m.firstChild != null) {
                            st.push(m.nextSibling);
                            m = m.firstChild;
                        } else {
                            m = m.nextSibling;
                        }
                    }
                } while (st.length > 0);
                break;

            case Step.FOLLOWINGSIBLING:
                if (xpc.contextNode === xpc.virtualRoot) {
                    break;
                }
                for (var m = xpc.contextNode.nextSibling; m != null; m = m.nextSibling) {
                    if (step.nodeTest.matches(m, xpc)) {
                        newNodes.push(m);
                    }
                }
                break;

            case Step.NAMESPACE:
                var n = {};
                if (xpc.contextNode.nodeType == 1 /*Node.ELEMENT_NODE*/) {
                    n["xml"] = XPath.XML_NAMESPACE_URI;
                    n["xmlns"] = XPath.XMLNS_NAMESPACE_URI;
                    for (var m = xpc.contextNode; m != null && m.nodeType == 1 /*Node.ELEMENT_NODE*/; m = m.parentNode) {
                        for (var k = 0; k < m.attributes.length; k++) {
                            var attr = m.attributes.item(k);
                            var nm = String(attr.name);
                            if (nm == "xmlns") {
                                if (n[""] == undefined) {
                                    n[""] = attr.value;
                                }
                            } else if (nm.length > 6 && nm.substring(0, 6) == "xmlns:") {
                                var pre = nm.substring(6, nm.length);
                                if (n[pre] == undefined) {
                                    n[pre] = attr.value;
                                }
                            }
                        }
                    }
                    for (var pre in n) {
                        var nsn = new XPathNamespace(pre, n[pre], xpc.contextNode);
                        if (step.nodeTest.matches(nsn, xpc)) {
                            newNodes.push(nsn);
                        }
                    }
                }
                break;

            case Step.PARENT:
                m = null;
                if (xpc.contextNode !== xpc.virtualRoot) {
                    if (xpc.contextNode.nodeType == 2 /*Node.ATTRIBUTE_NODE*/) {
                        m = PathExpr.getOwnerElement(xpc.contextNode);
                    } else {
                        m = xpc.contextNode.parentNode;
                    }
                }
                if (m != null && step.nodeTest.matches(m, xpc)) {
                    newNodes.push(m);
                }
                break;

            case Step.PRECEDING:
                var st;
                if (xpc.virtualRoot != null) {
                    st = [xpc.virtualRoot];
                } else {
                    // cannot rely on .ownerDocument because the node may be in a document fragment
                    st = [findRoot(xpc.contextNode)];
                }
                outer: while (st.length > 0) {
                    for (var m = st.pop(); m != null;) {
                        if (m == xpc.contextNode) {
                            break outer;
                        }
                        if (step.nodeTest.matches(m, xpc)) {
                            newNodes.unshift(m);
                        }
                        if (m.firstChild != null) {
                            st.push(m.nextSibling);
                            m = m.firstChild;
                        } else {
                            m = m.nextSibling;
                        }
                    }
                }
                break;

            case Step.PRECEDINGSIBLING:
                if (xpc.contextNode === xpc.virtualRoot) {
                    break;
                }
                for (var m = xpc.contextNode.previousSibling; m != null; m = m.previousSibling) {
                    if (step.nodeTest.matches(m, xpc)) {
                        newNodes.push(m);
                    }
                }
                break;

            case Step.SELF:
                if (step.nodeTest.matches(xpc.contextNode, xpc)) {
                    newNodes.push(xpc.contextNode);
                }
                break;

            default:
        }

        return newNodes;
    };

    function applyStepWithPredicates(step, xpc, node) {
        return PathExpr.applyPredicates(
            step.predicates,
            xpc,
            PathExpr.applyStep(step, xpc, node)
        );
    }

    function applyStepToNodes(context, nodes, step) {
        return flatten(
            map(
                applyStepWithPredicates.bind(null, step, context),
                nodes
            )
        );
    }

    PathExpr.applySteps = function (steps, xpc, nodes) {
        return reduce(
            applyStepToNodes.bind(null, xpc),
            nodes,
            steps
        );
    }

    PathExpr.prototype.applyFilter = function (c, xpc) {
        if (!this.filter) {
            return { nodes: [c.contextNode] };
        }

        var ns = this.filter.evaluate(c);

        if (!Utilities.instance_of(ns, XNodeSet)) {
            if (this.filterPredicates != null && this.filterPredicates.length > 0 || this.locationPath != null) {
                throw new Error("Path expression filter must evaluate to a nodeset if predicates or location path are used");
            }

            return { nonNodes: ns };
        }

        return {
            nodes: PathExpr.applyPredicates(this.filterPredicates || [], xpc, ns.toUnsortedArray())
        };
    };

    PathExpr.applyLocationPath = function (locationPath, xpc, nodes) {
        if (!locationPath) {
            return nodes;
        }

        var startNodes = locationPath.absolute ? [PathExpr.getRoot(xpc, nodes)] : nodes;

        return PathExpr.applySteps(locationPath.steps, xpc, startNodes);
    };

    PathExpr.prototype.evaluate = function (c) {
        var xpc = assign(new XPathContext(), c);

        var filterResult = this.applyFilter(c, xpc);

        if ('nonNodes' in filterResult) {
            return filterResult.nonNodes;
        }

        var ns = new XNodeSet();
        ns.addArray(PathExpr.applyLocationPath(this.locationPath, xpc, filterResult.nodes));
        return ns;
    };

    PathExpr.predicateMatches = function (pred, c) {
        var res = pred.evaluate(c);

        return Utilities.instance_of(res, XNumber)
            ? c.contextPosition === res.numberValue()
            : res.booleanValue();
    };

    PathExpr.predicateString = function (predicate) {
        return wrap('[', ']', predicate.toString());
    }

    PathExpr.predicatesString = function (predicates) {
        return join(
            '',
            map(PathExpr.predicateString, predicates)
        );
    }

    PathExpr.prototype.toString = function () {
        if (this.filter != undefined) {
            var filterStr = toString(this.filter);

            if (Utilities.instance_of(this.filter, XString)) {
                return wrap("'", "'", filterStr);
            }
            if (this.filterPredicates != undefined && this.filterPredicates.length) {
                return wrap('(', ')', filterStr) +
                    PathExpr.predicatesString(this.filterPredicates);
            }
            if (this.locationPath != undefined) {
                return filterStr +
                    (this.locationPath.absolute ? '' : '/') +
                    toString(this.locationPath);
            }

            return filterStr;
        }

        return toString(this.locationPath);
    };

    PathExpr.getOwnerElement = function (n) {
        // DOM 2 has ownerElement
        if (n.ownerElement) {
            return n.ownerElement;
        }
        // DOM 1 Internet Explorer can use selectSingleNode (ironically)
        try {
            if (n.selectSingleNode) {
                return n.selectSingleNode("..");
            }
        } catch (e) {
        }
        // Other DOM 1 implementations must use this egregious search
        var doc = n.nodeType == 9 /*Node.DOCUMENT_NODE*/
            ? n
            : n.ownerDocument;
        var elts = doc.getElementsByTagName("*");
        for (var i = 0; i < elts.length; i++) {
            var elt = elts.item(i);
            var nnm = elt.attributes;
            for (var j = 0; j < nnm.length; j++) {
                var an = nnm.item(j);
                if (an === n) {
                    return elt;
                }
            }
        }
        return null;
    };

    // LocationPath //////////////////////////////////////////////////////////////

    LocationPath.prototype = new Object();
    LocationPath.prototype.constructor = LocationPath;
    LocationPath.superclass = Object.prototype;

    function LocationPath(abs, steps) {
        if (arguments.length > 0) {
            this.init(abs, steps);
        }
    }

    LocationPath.prototype.init = function (abs, steps) {
        this.absolute = abs;
        this.steps = steps;
    };

    LocationPath.prototype.toString = function () {
        return (
            (this.absolute ? '/' : '') +
            map(toString, this.steps).join('/')
        );
    };

    // Step //////////////////////////////////////////////////////////////////////

    Step.prototype = new Object();
    Step.prototype.constructor = Step;
    Step.superclass = Object.prototype;

    function Step(axis, nodetest, preds) {
        if (arguments.length > 0) {
            this.init(axis, nodetest, preds);
        }
    }

    Step.prototype.init = function (axis, nodetest, preds) {
        this.axis = axis;
        this.nodeTest = nodetest;
        this.predicates = preds;
    };

    Step.prototype.toString = function () {
        return Step.STEPNAMES[this.axis] +
            "::" +
            this.nodeTest.toString() +
            PathExpr.predicatesString(this.predicates);
    };


    Step.ANCESTOR = 0;
    Step.ANCESTORORSELF = 1;
    Step.ATTRIBUTE = 2;
    Step.CHILD = 3;
    Step.DESCENDANT = 4;
    Step.DESCENDANTORSELF = 5;
    Step.FOLLOWING = 6;
    Step.FOLLOWINGSIBLING = 7;
    Step.NAMESPACE = 8;
    Step.PARENT = 9;
    Step.PRECEDING = 10;
    Step.PRECEDINGSIBLING = 11;
    Step.SELF = 12;

    Step.STEPNAMES = reduce(function (acc, x) { return acc[x[0]] = x[1], acc; }, {}, [
        [Step.ANCESTOR, 'ancestor'],
        [Step.ANCESTORORSELF, 'ancestor-or-self'],
        [Step.ATTRIBUTE, 'attribute'],
        [Step.CHILD, 'child'],
        [Step.DESCENDANT, 'descendant'],
        [Step.DESCENDANTORSELF, 'descendant-or-self'],
        [Step.FOLLOWING, 'following'],
        [Step.FOLLOWINGSIBLING, 'following-sibling'],
        [Step.NAMESPACE, 'namespace'],
        [Step.PARENT, 'parent'],
        [Step.PRECEDING, 'preceding'],
        [Step.PRECEDINGSIBLING, 'preceding-sibling'],
        [Step.SELF, 'self']
    ]);

    // NodeTest //////////////////////////////////////////////////////////////////

    NodeTest.prototype = new Object();
    NodeTest.prototype.constructor = NodeTest;
    NodeTest.superclass = Object.prototype;

    function NodeTest(type, value) {
        if (arguments.length > 0) {
            this.init(type, value);
        }
    }

    NodeTest.prototype.init = function (type, value) {
        this.type = type;
        this.value = value;
    };

    NodeTest.prototype.toString = function () {
        return "<unknown nodetest type>";
    };

    NodeTest.prototype.matches = function (n, xpc) {
        console.warn('unknown node test type');
    };

    NodeTest.NAMETESTANY = 0;
    NodeTest.NAMETESTPREFIXANY = 1;
    NodeTest.NAMETESTQNAME = 2;
    NodeTest.COMMENT = 3;
    NodeTest.TEXT = 4;
    NodeTest.PI = 5;
    NodeTest.NODE = 6;

    NodeTest.isNodeType = function (types) {
        return function (node) {
            return includes(types, node.nodeType);
        };
    };

    NodeTest.makeNodeTestType = function (type, members, ctor) {
        var newType = ctor || function () { };

        newType.prototype = new NodeTest(type);
        newType.prototype.constructor = newType;

        assign(newType.prototype, members);

        return newType;
    };
    // create invariant node test for certain node types
    NodeTest.makeNodeTypeTest = function (type, nodeTypes, stringVal) {
        return new (NodeTest.makeNodeTestType(type, {
            matches: NodeTest.isNodeType(nodeTypes),
            toString: always(stringVal)
        }))();
    };

    NodeTest.hasPrefix = function (node) {
        return node.prefix || (node.nodeName || node.tagName).indexOf(':') !== -1;
    };

    NodeTest.isElementOrAttribute = NodeTest.isNodeType([1, 2]);
    NodeTest.nameSpaceMatches = function (prefix, xpc, n) {
        var nNamespace = (n.namespaceURI || '');

        if (!prefix) {
            return !nNamespace || (xpc.allowAnyNamespaceForNoPrefix && !NodeTest.hasPrefix(n));
        }

        var ns = xpc.namespaceResolver.getNamespace(prefix, xpc.expressionContextNode);

        if (ns == null) {
            throw new Error("Cannot resolve QName " + prefix);
        }

        return ns === nNamespace;
    };
    NodeTest.localNameMatches = function (localName, xpc, n) {
        var nLocalName = (n.localName || n.nodeName);

        return xpc.caseInsensitive
            ? localName.toLowerCase() === nLocalName.toLowerCase()
            : localName === nLocalName;
    };

    NodeTest.NameTestPrefixAny = NodeTest.makeNodeTestType(
        NodeTest.NAMETESTPREFIXANY,
        {
            matches: function (n, xpc) {
                return NodeTest.isElementOrAttribute(n) &&
                    NodeTest.nameSpaceMatches(this.prefix, xpc, n);
            },
            toString: function () {
                return this.prefix + ":*";
            }
        },
        function NameTestPrefixAny(prefix) { this.prefix = prefix; }
    );

    NodeTest.NameTestQName = NodeTest.makeNodeTestType(
        NodeTest.NAMETESTQNAME,
        {
            matches: function (n, xpc) {
                return NodeTest.isNodeType([1, 2, XPathNamespace.XPATH_NAMESPACE_NODE])(n) &&
                    NodeTest.nameSpaceMatches(this.prefix, xpc, n) &&
                    NodeTest.localNameMatches(this.localName, xpc, n);
            },
            toString: function () {
                return this.name;
            }
        },
        function NameTestQName(name) {
            var nameParts = name.split(':');

            this.name = name;
            this.prefix = nameParts.length > 1 ? nameParts[0] : null;
            this.localName = nameParts[nameParts.length > 1 ? 1 : 0];
        }
    );

    NodeTest.PITest = NodeTest.makeNodeTestType(NodeTest.PI, {
        matches: function (n, xpc) {
            return NodeTest.isNodeType([7])(n) && (n.target || n.nodeName) === this.name;
        },
        toString: function () {
            return wrap('processing-instruction("', '")', this.name);
        }
    }, function (name) { this.name = name; })

    // singletons

    // elements, attributes, namespaces
    NodeTest.nameTestAny = NodeTest.makeNodeTypeTest(NodeTest.NAMETESTANY, [1, 2, XPathNamespace.XPATH_NAMESPACE_NODE], '*');
    // text, cdata
    NodeTest.textTest = NodeTest.makeNodeTypeTest(NodeTest.TEXT, [3, 4], 'text()');
    NodeTest.commentTest = NodeTest.makeNodeTypeTest(NodeTest.COMMENT, [8], 'comment()');
    // elements, attributes, text, cdata, PIs, comments, document nodes
    NodeTest.nodeTest = NodeTest.makeNodeTypeTest(NodeTest.NODE, [1, 2, 3, 4, 7, 8, 9], 'node()');
    NodeTest.anyPiTest = NodeTest.makeNodeTypeTest(NodeTest.PI, [7], 'processing-instruction()');

    // VariableReference /////////////////////////////////////////////////////////

    VariableReference.prototype = new Expression();
    VariableReference.prototype.constructor = VariableReference;
    VariableReference.superclass = Expression.prototype;

    function VariableReference(v) {
        if (arguments.length > 0) {
            this.init(v);
        }
    }

    VariableReference.prototype.init = function (v) {
        this.variable = v;
    };

    VariableReference.prototype.toString = function () {
        return "$" + this.variable;
    };

    VariableReference.prototype.evaluate = function (c) {
        var parts = Utilities.resolveQName(this.variable, c.namespaceResolver, c.contextNode, false);

        if (parts[0] == null) {
            throw new Error("Cannot resolve QName " + fn);
        }
        var result = c.variableResolver.getVariable(parts[1], parts[0]);
        if (!result) {
            throw XPathException.fromMessage("Undeclared variable: " + this.toString());
        }
        return result;
    };

    // FunctionCall //////////////////////////////////////////////////////////////

    FunctionCall.prototype = new Expression();
    FunctionCall.prototype.constructor = FunctionCall;
    FunctionCall.superclass = Expression.prototype;

    function FunctionCall(fn, args) {
        if (arguments.length > 0) {
            this.init(fn, args);
        }
    }

    FunctionCall.prototype.init = function (fn, args) {
        this.functionName = fn;
        this.arguments = args;
    };

    FunctionCall.prototype.toString = function () {
        var s = this.functionName + "(";
        for (var i = 0; i < this.arguments.length; i++) {
            if (i > 0) {
                s += ", ";
            }
            s += this.arguments[i].toString();
        }
        return s + ")";
    };

    FunctionCall.prototype.evaluate = function (c) {
        var f = FunctionResolver.getFunctionFromContext(this.functionName, c);

        if (!f) {
            throw new Error("Unknown function " + this.functionName);
        }

        var a = [c].concat(this.arguments);
        return f.apply(c.functionResolver.thisArg, a);
    };

    // Operators /////////////////////////////////////////////////////////////////

    var Operators = new Object();

    Operators.equals = function (l, r) {
        return l.equals(r);
    };

    Operators.notequal = function (l, r) {
        return l.notequal(r);
    };

    Operators.lessthan = function (l, r) {
        return l.lessthan(r);
    };

    Operators.greaterthan = function (l, r) {
        return l.greaterthan(r);
    };

    Operators.lessthanorequal = function (l, r) {
        return l.lessthanorequal(r);
    };

    Operators.greaterthanorequal = function (l, r) {
        return l.greaterthanorequal(r);
    };

    // XString ///////////////////////////////////////////////////////////////////

    XString.prototype = new Expression();
    XString.prototype.constructor = XString;
    XString.superclass = Expression.prototype;

    function XString(s) {
        if (arguments.length > 0) {
            this.init(s);
        }
    }

    XString.prototype.init = function (s) {
        this.str = String(s);
    };

    XString.prototype.toString = function () {
        return this.str;
    };

    XString.prototype.evaluate = function (c) {
        return this;
    };

    XString.prototype.string = function () {
        return this;
    };

    XString.prototype.number = function () {
        return new XNumber(this.str);
    };

    XString.prototype.bool = function () {
        return new XBoolean(this.str);
    };

    XString.prototype.nodeset = function () {
        throw new Error("Cannot convert string to nodeset");
    };

    XString.prototype.stringValue = function () {
        return this.str;
    };

    XString.prototype.numberValue = function () {
        return this.number().numberValue();
    };

    XString.prototype.booleanValue = function () {
        return this.bool().booleanValue();
    };

    XString.prototype.equals = function (r) {
        if (Utilities.instance_of(r, XBoolean)) {
            return this.bool().equals(r);
        }
        if (Utilities.instance_of(r, XNumber)) {
            return this.number().equals(r);
        }
        if (Utilities.instance_of(r, XNodeSet)) {
            return r.compareWithString(this, Operators.equals);
        }
        return new XBoolean(this.str == r.str);
    };

    XString.prototype.notequal = function (r) {
        if (Utilities.instance_of(r, XBoolean)) {
            return this.bool().notequal(r);
        }
        if (Utilities.instance_of(r, XNumber)) {
            return this.number().notequal(r);
        }
        if (Utilities.instance_of(r, XNodeSet)) {
            return r.compareWithString(this, Operators.notequal);
        }
        return new XBoolean(this.str != r.str);
    };

    XString.prototype.lessthan = function (r) {
        return this.number().lessthan(r);
    };

    XString.prototype.greaterthan = function (r) {
        return this.number().greaterthan(r);
    };

    XString.prototype.lessthanorequal = function (r) {
        return this.number().lessthanorequal(r);
    };

    XString.prototype.greaterthanorequal = function (r) {
        return this.number().greaterthanorequal(r);
    };

    // XNumber ///////////////////////////////////////////////////////////////////

    XNumber.prototype = new Expression();
    XNumber.prototype.constructor = XNumber;
    XNumber.superclass = Expression.prototype;

    function XNumber(n) {
        if (arguments.length > 0) {
            this.init(n);
        }
    }

    XNumber.prototype.init = function (n) {
        this.num = typeof n === "string" ? this.parse(n) : Number(n);
    };

    XNumber.prototype.numberFormat = /^\s*-?[0-9]*\.?[0-9]+\s*$/;

    XNumber.prototype.parse = function (s) {
        // XPath representation of numbers is more restrictive than what Number() or parseFloat() allow
        return this.numberFormat.test(s) ? parseFloat(s) : Number.NaN;
    };

    function padSmallNumber(numberStr) {
        var parts = numberStr.split('e-');
        var base = parts[0].replace('.', '');
        var exponent = Number(parts[1]);

        for (var i = 0; i < exponent - 1; i += 1) {
            base = '0' + base;
        }

        return '0.' + base;
    }

    function padLargeNumber(numberStr) {
        var parts = numberStr.split('e');
        var base = parts[0].replace('.', '');
        var exponent = Number(parts[1]);
        var zerosToAppend = exponent + 1 - base.length;

        for (var i = 0; i < zerosToAppend; i += 1) {
            base += '0';
        }

        return base;
    }

    XNumber.prototype.toString = function () {
        var strValue = this.num.toString();

        if (strValue.indexOf('e-') !== -1) {
            return padSmallNumber(strValue);
        }

        if (strValue.indexOf('e') !== -1) {
            return padLargeNumber(strValue);
        }

        return strValue;
    };

    XNumber.prototype.evaluate = function (c) {
        return this;
    };

    XNumber.prototype.string = function () {


        return new XString(this.toString());
    };

    XNumber.prototype.number = function () {
        return this;
    };

    XNumber.prototype.bool = function () {
        return new XBoolean(this.num);
    };

    XNumber.prototype.nodeset = function () {
        throw new Error("Cannot convert number to nodeset");
    };

    XNumber.prototype.stringValue = function () {
        return this.string().stringValue();
    };

    XNumber.prototype.numberValue = function () {
        return this.num;
    };

    XNumber.prototype.booleanValue = function () {
        return this.bool().booleanValue();
    };

    XNumber.prototype.negate = function () {
        return new XNumber(-this.num);
    };

    XNumber.prototype.equals = function (r) {
        if (Utilities.instance_of(r, XBoolean)) {
            return this.bool().equals(r);
        }
        if (Utilities.instance_of(r, XString)) {
            return this.equals(r.number());
        }
        if (Utilities.instance_of(r, XNodeSet)) {
            return r.compareWithNumber(this, Operators.equals);
        }
        return new XBoolean(this.num == r.num);
    };

    XNumber.prototype.notequal = function (r) {
        if (Utilities.instance_of(r, XBoolean)) {
            return this.bool().notequal(r);
        }
        if (Utilities.instance_of(r, XString)) {
            return this.notequal(r.number());
        }
        if (Utilities.instance_of(r, XNodeSet)) {
            return r.compareWithNumber(this, Operators.notequal);
        }
        return new XBoolean(this.num != r.num);
    };

    XNumber.prototype.lessthan = function (r) {
        if (Utilities.instance_of(r, XNodeSet)) {
            return r.compareWithNumber(this, Operators.greaterthan);
        }
        if (Utilities.instance_of(r, XBoolean) || Utilities.instance_of(r, XString)) {
            return this.lessthan(r.number());
        }
        return new XBoolean(this.num < r.num);
    };

    XNumber.prototype.greaterthan = function (r) {
        if (Utilities.instance_of(r, XNodeSet)) {
            return r.compareWithNumber(this, Operators.lessthan);
        }
        if (Utilities.instance_of(r, XBoolean) || Utilities.instance_of(r, XString)) {
            return this.greaterthan(r.number());
        }
        return new XBoolean(this.num > r.num);
    };

    XNumber.prototype.lessthanorequal = function (r) {
        if (Utilities.instance_of(r, XNodeSet)) {
            return r.compareWithNumber(this, Operators.greaterthanorequal);
        }
        if (Utilities.instance_of(r, XBoolean) || Utilities.instance_of(r, XString)) {
            return this.lessthanorequal(r.number());
        }
        return new XBoolean(this.num <= r.num);
    };

    XNumber.prototype.greaterthanorequal = function (r) {
        if (Utilities.instance_of(r, XNodeSet)) {
            return r.compareWithNumber(this, Operators.lessthanorequal);
        }
        if (Utilities.instance_of(r, XBoolean) || Utilities.instance_of(r, XString)) {
            return this.greaterthanorequal(r.number());
        }
        return new XBoolean(this.num >= r.num);
    };

    XNumber.prototype.plus = function (r) {
        return new XNumber(this.num + r.num);
    };

    XNumber.prototype.minus = function (r) {
        return new XNumber(this.num - r.num);
    };

    XNumber.prototype.multiply = function (r) {
        return new XNumber(this.num * r.num);
    };

    XNumber.prototype.div = function (r) {
        return new XNumber(this.num / r.num);
    };

    XNumber.prototype.mod = function (r) {
        return new XNumber(this.num % r.num);
    };

    // XBoolean //////////////////////////////////////////////////////////////////

    XBoolean.prototype = new Expression();
    XBoolean.prototype.constructor = XBoolean;
    XBoolean.superclass = Expression.prototype;

    function XBoolean(b) {
        if (arguments.length > 0) {
            this.init(b);
        }
    }

    XBoolean.prototype.init = function (b) {
        this.b = Boolean(b);
    };

    XBoolean.prototype.toString = function () {
        return this.b.toString();
    };

    XBoolean.prototype.evaluate = function (c) {
        return this;
    };

    XBoolean.prototype.string = function () {
        return new XString(this.b);
    };

    XBoolean.prototype.number = function () {
        return new XNumber(this.b);
    };

    XBoolean.prototype.bool = function () {
        return this;
    };

    XBoolean.prototype.nodeset = function () {
        throw new Error("Cannot convert boolean to nodeset");
    };

    XBoolean.prototype.stringValue = function () {
        return this.string().stringValue();
    };

    XBoolean.prototype.numberValue = function () {
        return this.number().numberValue();
    };

    XBoolean.prototype.booleanValue = function () {
        return this.b;
    };

    XBoolean.prototype.not = function () {
        return new XBoolean(!this.b);
    };

    XBoolean.prototype.equals = function (r) {
        if (Utilities.instance_of(r, XString) || Utilities.instance_of(r, XNumber)) {
            return this.equals(r.bool());
        }
        if (Utilities.instance_of(r, XNodeSet)) {
            return r.compareWithBoolean(this, Operators.equals);
        }
        return new XBoolean(this.b == r.b);
    };

    XBoolean.prototype.notequal = function (r) {
        if (Utilities.instance_of(r, XString) || Utilities.instance_of(r, XNumber)) {
            return this.notequal(r.bool());
        }
        if (Utilities.instance_of(r, XNodeSet)) {
            return r.compareWithBoolean(this, Operators.notequal);
        }
        return new XBoolean(this.b != r.b);
    };

    XBoolean.prototype.lessthan = function (r) {
        return this.number().lessthan(r);
    };

    XBoolean.prototype.greaterthan = function (r) {
        return this.number().greaterthan(r);
    };

    XBoolean.prototype.lessthanorequal = function (r) {
        return this.number().lessthanorequal(r);
    };

    XBoolean.prototype.greaterthanorequal = function (r) {
        return this.number().greaterthanorequal(r);
    };

    XBoolean.true_ = new XBoolean(true);
    XBoolean.false_ = new XBoolean(false);

    // AVLTree ///////////////////////////////////////////////////////////////////

    AVLTree.prototype = new Object();
    AVLTree.prototype.constructor = AVLTree;
    AVLTree.superclass = Object.prototype;

    function AVLTree(n) {
        this.init(n);
    }

    AVLTree.prototype.init = function (n) {
        this.left = null;
        this.right = null;
        this.node = n;
        this.depth = 1;
    };

    AVLTree.prototype.balance = function () {
        var ldepth = this.left == null ? 0 : this.left.depth;
        var rdepth = this.right == null ? 0 : this.right.depth;

        if (ldepth > rdepth + 1) {
            // LR or LL rotation
            var lldepth = this.left.left == null ? 0 : this.left.left.depth;
            var lrdepth = this.left.right == null ? 0 : this.left.right.depth;

            if (lldepth < lrdepth) {
                // LR rotation consists of a RR rotation of the left child
                this.left.rotateRR();
                // plus a LL rotation of this node, which happens anyway
            }
            this.rotateLL();
        } else if (ldepth + 1 < rdepth) {
            // RR or RL rorarion
            var rrdepth = this.right.right == null ? 0 : this.right.right.depth;
            var rldepth = this.right.left == null ? 0 : this.right.left.depth;

            if (rldepth > rrdepth) {
                // RR rotation consists of a LL rotation of the right child
                this.right.rotateLL();
                // plus a RR rotation of this node, which happens anyway
            }
            this.rotateRR();
        }
    };

    AVLTree.prototype.rotateLL = function () {
        // the left side is too long => rotate from the left (_not_ leftwards)
        var nodeBefore = this.node;
        var rightBefore = this.right;
        this.node = this.left.node;
        this.right = this.left;
        this.left = this.left.left;
        this.right.left = this.right.right;
        this.right.right = rightBefore;
        this.right.node = nodeBefore;
        this.right.updateInNewLocation();
        this.updateInNewLocation();
    };

    AVLTree.prototype.rotateRR = function () {
        // the right side is too long => rotate from the right (_not_ rightwards)
        var nodeBefore = this.node;
        var leftBefore = this.left;
        this.node = this.right.node;
        this.left = this.right;
        this.right = this.right.right;
        this.left.right = this.left.left;
        this.left.left = leftBefore;
        this.left.node = nodeBefore;
        this.left.updateInNewLocation();
        this.updateInNewLocation();
    };

    AVLTree.prototype.updateInNewLocation = function () {
        this.getDepthFromChildren();
    };

    AVLTree.prototype.getDepthFromChildren = function () {
        this.depth = this.node == null ? 0 : 1;
        if (this.left != null) {
            this.depth = this.left.depth + 1;
        }
        if (this.right != null && this.depth <= this.right.depth) {
            this.depth = this.right.depth + 1;
        }
    };

    function nodeOrder(n1, n2) {
        if (n1 === n2) {
            return 0;
        }

        if (n1.compareDocumentPosition) {
            var cpos = n1.compareDocumentPosition(n2);

            if (cpos & 0x01) {
                // not in the same document; return an arbitrary result (is there a better way to do this)
                return 1;
            }
            if (cpos & 0x0A) {
                // n2 precedes or contains n1
                return 1;
            }
            if (cpos & 0x14) {
                // n2 follows or is contained by n1
                return -1;
            }

            return 0;
        }

        var d1 = 0,
            d2 = 0;
        for (var m1 = n1; m1 != null; m1 = m1.parentNode || m1.ownerElement) {
            d1++;
        }
        for (var m2 = n2; m2 != null; m2 = m2.parentNode || m2.ownerElement) {
            d2++;
        }

        // step up to same depth
        if (d1 > d2) {
            while (d1 > d2) {
                n1 = n1.parentNode || n1.ownerElement;
                d1--;
            }
            if (n1 === n2) {
                return 1;
            }
        } else if (d2 > d1) {
            while (d2 > d1) {
                n2 = n2.parentNode || n2.ownerElement;
                d2--;
            }
            if (n1 === n2) {
                return -1;
            }
        }

        var n1Par = n1.parentNode || n1.ownerElement,
            n2Par = n2.parentNode || n2.ownerElement;

        // find common parent
        while (n1Par !== n2Par) {
            n1 = n1Par;
            n2 = n2Par;
            n1Par = n1.parentNode || n1.ownerElement;
            n2Par = n2.parentNode || n2.ownerElement;
        }

        var n1isAttr = Utilities.isAttribute(n1);
        var n2isAttr = Utilities.isAttribute(n2);

        if (n1isAttr && !n2isAttr) {
            return -1;
        }
        if (!n1isAttr && n2isAttr) {
            return 1;
        }

        if (n1Par) {
            var cn = n1isAttr ? n1Par.attributes : n1Par.childNodes,
                len = cn.length;
            for (var i = 0; i < len; i += 1) {
                var n = cn[i];
                if (n === n1) {
                    return -1;
                }
                if (n === n2) {
                    return 1;
                }
            }
        }

        throw new Error('Unexpected: could not determine node order');
    }

    AVLTree.prototype.add = function (n) {
        if (n === this.node) {
            return false;
        }

        var o = nodeOrder(n, this.node);

        var ret = false;
        if (o == -1) {
            if (this.left == null) {
                this.left = new AVLTree(n);
                ret = true;
            } else {
                ret = this.left.add(n);
                if (ret) {
                    this.balance();
                }
            }
        } else if (o == 1) {
            if (this.right == null) {
                this.right = new AVLTree(n);
                ret = true;
            } else {
                ret = this.right.add(n);
                if (ret) {
                    this.balance();
                }
            }
        }

        if (ret) {
            this.getDepthFromChildren();
        }
        return ret;
    };

    // XNodeSet //////////////////////////////////////////////////////////////////

    XNodeSet.prototype = new Expression();
    XNodeSet.prototype.constructor = XNodeSet;
    XNodeSet.superclass = Expression.prototype;

    function XNodeSet() {
        this.init();
    }

    XNodeSet.prototype.init = function () {
        this.tree = null;
        this.nodes = [];
        this.size = 0;
    };

    XNodeSet.prototype.toString = function () {
        var p = this.first();
        if (p == null) {
            return "";
        }
        return this.stringForNode(p);
    };

    XNodeSet.prototype.evaluate = function (c) {
        return this;
    };

    XNodeSet.prototype.string = function () {
        return new XString(this.toString());
    };

    XNodeSet.prototype.stringValue = function () {
        return this.toString();
    };

    XNodeSet.prototype.number = function () {
        return new XNumber(this.string());
    };

    XNodeSet.prototype.numberValue = function () {
        return Number(this.string());
    };

    XNodeSet.prototype.bool = function () {
        return new XBoolean(this.booleanValue());
    };

    XNodeSet.prototype.booleanValue = function () {
        return !!this.size;
    };

    XNodeSet.prototype.nodeset = function () {
        return this;
    };

    XNodeSet.prototype.stringForNode = function (n) {
        if (n.nodeType == 9   /*Node.DOCUMENT_NODE*/ ||
            n.nodeType == 1   /*Node.ELEMENT_NODE */ ||
            n.nodeType === 11 /*Node.DOCUMENT_FRAGMENT*/) {
            return this.stringForContainerNode(n);
        }
        if (n.nodeType === 2 /* Node.ATTRIBUTE_NODE */) {
            return n.value || n.nodeValue;
        }
        if (n.isNamespaceNode) {
            return n.namespace;
        }
        return n.nodeValue;
    };

    XNodeSet.prototype.stringForContainerNode = function (n) {
        var s = "";
        for (var n2 = n.firstChild; n2 != null; n2 = n2.nextSibling) {
            var nt = n2.nodeType;
            //  Element,    Text,       CDATA,      Document,   Document Fragment
            if (nt === 1 || nt === 3 || nt === 4 || nt === 9 || nt === 11) {
                s += this.stringForNode(n2);
            }
        }
        return s;
    };

    XNodeSet.prototype.buildTree = function () {
        if (!this.tree && this.nodes.length) {
            this.tree = new AVLTree(this.nodes[0]);
            for (var i = 1; i < this.nodes.length; i += 1) {
                this.tree.add(this.nodes[i]);
            }
        }

        return this.tree;
    };

    XNodeSet.prototype.first = function () {
        var p = this.buildTree();
        if (p == null) {
            return null;
        }
        while (p.left != null) {
            p = p.left;
        }
        return p.node;
    };

    XNodeSet.prototype.add = function (n) {
        for (var i = 0; i < this.nodes.length; i += 1) {
            if (n === this.nodes[i]) {
                return;
            }
        }

        this.tree = null;
        this.nodes.push(n);
        this.size += 1;
    };

    XNodeSet.prototype.addArray = function (ns) {
        var self = this;

        forEach(function (x) { self.add(x); }, ns);
    };

    /**
     * Returns an array of the node set's contents in document order
     */
    XNodeSet.prototype.toArray = function () {
        var a = [];
        this.toArrayRec(this.buildTree(), a);
        return a;
    };

    XNodeSet.prototype.toArrayRec = function (t, a) {
        if (t != null) {
            this.toArrayRec(t.left, a);
            a.push(t.node);
            this.toArrayRec(t.right, a);
        }
    };

    /**
     * Returns an array of the node set's contents in arbitrary order
     */
    XNodeSet.prototype.toUnsortedArray = function () {
        return this.nodes.slice();
    };

    XNodeSet.prototype.compareWithString = function (r, o) {
        var a = this.toUnsortedArray();
        for (var i = 0; i < a.length; i++) {
            var n = a[i];
            var l = new XString(this.stringForNode(n));
            var res = o(l, r);
            if (res.booleanValue()) {
                return res;
            }
        }
        return new XBoolean(false);
    };

    XNodeSet.prototype.compareWithNumber = function (r, o) {
        var a = this.toUnsortedArray();
        for (var i = 0; i < a.length; i++) {
            var n = a[i];
            var l = new XNumber(this.stringForNode(n));
            var res = o(l, r);
            if (res.booleanValue()) {
                return res;
            }
        }
        return new XBoolean(false);
    };

    XNodeSet.prototype.compareWithBoolean = function (r, o) {
        return o(this.bool(), r);
    };

    XNodeSet.prototype.compareWithNodeSet = function (r, o) {
        var arr = this.toUnsortedArray();
        var oInvert = function (lop, rop) { return o(rop, lop); };

        for (var i = 0; i < arr.length; i++) {
            var l = new XString(this.stringForNode(arr[i]));

            var res = r.compareWithString(l, oInvert);
            if (res.booleanValue()) {
                return res;
            }
        }

        return new XBoolean(false);
    };

    XNodeSet.compareWith = curry(function (o, r) {
        if (Utilities.instance_of(r, XString)) {
            return this.compareWithString(r, o);
        }
        if (Utilities.instance_of(r, XNumber)) {
            return this.compareWithNumber(r, o);
        }
        if (Utilities.instance_of(r, XBoolean)) {
            return this.compareWithBoolean(r, o);
        }
        return this.compareWithNodeSet(r, o);
    });

    XNodeSet.prototype.equals = XNodeSet.compareWith(Operators.equals);
    XNodeSet.prototype.notequal = XNodeSet.compareWith(Operators.notequal);
    XNodeSet.prototype.lessthan = XNodeSet.compareWith(Operators.lessthan);
    XNodeSet.prototype.greaterthan = XNodeSet.compareWith(Operators.greaterthan);
    XNodeSet.prototype.lessthanorequal = XNodeSet.compareWith(Operators.lessthanorequal);
    XNodeSet.prototype.greaterthanorequal = XNodeSet.compareWith(Operators.greaterthanorequal);

    XNodeSet.prototype.union = function (r) {
        var ns = new XNodeSet();
        ns.addArray(this.toUnsortedArray());
        ns.addArray(r.toUnsortedArray());
        return ns;
    };

    // XPathNamespace ////////////////////////////////////////////////////////////

    XPathNamespace.prototype = new Object();
    XPathNamespace.prototype.constructor = XPathNamespace;
    XPathNamespace.superclass = Object.prototype;

    function XPathNamespace(pre, ns, p) {
        this.isXPathNamespace = true;
        this.ownerDocument = p.ownerDocument;
        this.nodeName = "#namespace";
        this.prefix = pre;
        this.localName = pre;
        this.namespaceURI = ns;
        this.nodeValue = ns;
        this.ownerElement = p;
        this.nodeType = XPathNamespace.XPATH_NAMESPACE_NODE;
    }

    XPathNamespace.prototype.toString = function () {
        return "{ \"" + this.prefix + "\", \"" + this.namespaceURI + "\" }";
    };

    // XPathContext //////////////////////////////////////////////////////////////

    XPathContext.prototype = new Object();
    XPathContext.prototype.constructor = XPathContext;
    XPathContext.superclass = Object.prototype;

    function XPathContext(vr, nr, fr) {
        this.variableResolver = vr != null ? vr : new VariableResolver();
        this.namespaceResolver = nr != null ? nr : new NamespaceResolver();
        this.functionResolver = fr != null ? fr : new FunctionResolver();
    }

    XPathContext.prototype.extend = function (newProps) {
        return assign(new XPathContext(), this, newProps);
    };

    // VariableResolver //////////////////////////////////////////////////////////

    VariableResolver.prototype = new Object();
    VariableResolver.prototype.constructor = VariableResolver;
    VariableResolver.superclass = Object.prototype;

    function VariableResolver() {
    }

    VariableResolver.prototype.getVariable = function (ln, ns) {
        return null;
    };

    // FunctionResolver //////////////////////////////////////////////////////////

    FunctionResolver.prototype = new Object();
    FunctionResolver.prototype.constructor = FunctionResolver;
    FunctionResolver.superclass = Object.prototype;

    function FunctionResolver(thisArg) {
        this.thisArg = thisArg != null ? thisArg : Functions;
        this.functions = new Object();
        this.addStandardFunctions();
    }

    FunctionResolver.prototype.addStandardFunctions = function () {
        this.functions["{}last"] = Functions.last;
        this.functions["{}position"] = Functions.position;
        this.functions["{}count"] = Functions.count;
        this.functions["{}id"] = Functions.id;
        this.functions["{}local-name"] = Functions.localName;
        this.functions["{}namespace-uri"] = Functions.namespaceURI;
        this.functions["{}name"] = Functions.name;
        this.functions["{}string"] = Functions.string;
        this.functions["{}concat"] = Functions.concat;
        this.functions["{}starts-with"] = Functions.startsWith;
        this.functions["{}contains"] = Functions.contains;
        this.functions["{}substring-before"] = Functions.substringBefore;
        this.functions["{}substring-after"] = Functions.substringAfter;
        this.functions["{}substring"] = Functions.substring;
        this.functions["{}string-length"] = Functions.stringLength;
        this.functions["{}normalize-space"] = Functions.normalizeSpace;
        this.functions["{}translate"] = Functions.translate;
        this.functions["{}boolean"] = Functions.boolean_;
        this.functions["{}not"] = Functions.not;
        this.functions["{}true"] = Functions.true_;
        this.functions["{}false"] = Functions.false_;
        this.functions["{}lang"] = Functions.lang;
        this.functions["{}number"] = Functions.number;
        this.functions["{}sum"] = Functions.sum;
        this.functions["{}floor"] = Functions.floor;
        this.functions["{}ceiling"] = Functions.ceiling;
        this.functions["{}round"] = Functions.round;
    };

    FunctionResolver.prototype.addFunction = function (ns, ln, f) {
        this.functions["{" + ns + "}" + ln] = f;
    };

    FunctionResolver.getFunctionFromContext = function (qName, context) {
        var parts = Utilities.resolveQName(qName, context.namespaceResolver, context.contextNode, false);

        if (parts[0] === null) {
            throw new Error("Cannot resolve QName " + name);
        }

        return context.functionResolver.getFunction(parts[1], parts[0]);
    };

    FunctionResolver.prototype.getFunction = function (localName, namespace) {
        return this.functions["{" + namespace + "}" + localName];
    };

    // NamespaceResolver /////////////////////////////////////////////////////////

    NamespaceResolver.prototype = new Object();
    NamespaceResolver.prototype.constructor = NamespaceResolver;
    NamespaceResolver.superclass = Object.prototype;

    function NamespaceResolver() {
    }

    NamespaceResolver.prototype.getNamespace = function (prefix, n) {
        if (prefix == "xml") {
            return XPath.XML_NAMESPACE_URI;
        } else if (prefix == "xmlns") {
            return XPath.XMLNS_NAMESPACE_URI;
        }
        if (n.nodeType == 9 /*Node.DOCUMENT_NODE*/) {
            n = n.documentElement;
        } else if (n.nodeType == 2 /*Node.ATTRIBUTE_NODE*/) {
            n = PathExpr.getOwnerElement(n);
        } else if (n.nodeType != 1 /*Node.ELEMENT_NODE*/) {
            n = n.parentNode;
        }
        while (n != null && n.nodeType == 1 /*Node.ELEMENT_NODE*/) {
            var nnm = n.attributes;
            for (var i = 0; i < nnm.length; i++) {
                var a = nnm.item(i);
                var aname = a.name || a.nodeName;
                if ((aname === "xmlns" && prefix === "")
                    || aname === "xmlns:" + prefix) {
                    return String(a.value || a.nodeValue);
                }
            }
            n = n.parentNode;
        }
        return null;
    };

    // Functions /////////////////////////////////////////////////////////////////

    var Functions = new Object();

    Functions.last = function (c) {
        if (arguments.length != 1) {
            throw new Error("Function last expects ()");
        }

        return new XNumber(c.contextSize);
    };

    Functions.position = function (c) {
        if (arguments.length != 1) {
            throw new Error("Function position expects ()");
        }

        return new XNumber(c.contextPosition);
    };

    Functions.count = function () {
        var c = arguments[0];
        var ns;
        if (arguments.length != 2 || !Utilities.instance_of(ns = arguments[1].evaluate(c), XNodeSet)) {
            throw new Error("Function count expects (node-set)");
        }
        return new XNumber(ns.size);
    };

    Functions.id = function () {
        var c = arguments[0];
        var id;
        if (arguments.length != 2) {
            throw new Error("Function id expects (object)");
        }
        id = arguments[1].evaluate(c);
        if (Utilities.instance_of(id, XNodeSet)) {
            id = id.toArray().join(" ");
        } else {
            id = id.stringValue();
        }
        var ids = id.split(/[\x0d\x0a\x09\x20]+/);
        var count = 0;
        var ns = new XNodeSet();
        var doc = c.contextNode.nodeType == 9 /*Node.DOCUMENT_NODE*/
            ? c.contextNode
            : c.contextNode.ownerDocument;
        for (var i = 0; i < ids.length; i++) {
            var n;
            if (doc.getElementById) {
                n = doc.getElementById(ids[i]);
            } else {
                n = Utilities.getElementById(doc, ids[i]);
            }
            if (n != null) {
                ns.add(n);
                count++;
            }
        }
        return ns;
    };

    Functions.localName = function (c, eNode) {
        var n;

        if (arguments.length == 1) {
            n = c.contextNode;
        } else if (arguments.length == 2) {
            n = eNode.evaluate(c).first();
        } else {
            throw new Error("Function local-name expects (node-set?)");
        }

        if (n == null) {
            return new XString("");
        }

        return new XString(
            n.localName ||     //  standard elements and attributes
            n.baseName ||     //  IE
            n.target ||     //  processing instructions
            n.nodeName ||     //  DOM1 elements
            ""                 //  fallback
        );
    };

    Functions.namespaceURI = function () {
        var c = arguments[0];
        var n;
        if (arguments.length == 1) {
            n = c.contextNode;
        } else if (arguments.length == 2) {
            n = arguments[1].evaluate(c).first();
        } else {
            throw new Error("Function namespace-uri expects (node-set?)");
        }
        if (n == null) {
            return new XString("");
        }
        return new XString(n.namespaceURI);
    };

    Functions.name = function () {
        var c = arguments[0];
        var n;
        if (arguments.length == 1) {
            n = c.contextNode;
        } else if (arguments.length == 2) {
            n = arguments[1].evaluate(c).first();
        } else {
            throw new Error("Function name expects (node-set?)");
        }
        if (n == null) {
            return new XString("");
        }
        if (n.nodeType == 1 /*Node.ELEMENT_NODE*/) {
            return new XString(n.nodeName);
        } else if (n.nodeType == 2 /*Node.ATTRIBUTE_NODE*/) {
            return new XString(n.name || n.nodeName);
        } else if (n.nodeType === 7 /*Node.PROCESSING_INSTRUCTION_NODE*/) {
            return new XString(n.target || n.nodeName);
        } else if (n.localName == null) {
            return new XString("");
        } else {
            return new XString(n.localName);
        }
    };

    Functions.string = function () {
        var c = arguments[0];
        if (arguments.length == 1) {
            return new XString(XNodeSet.prototype.stringForNode(c.contextNode));
        } else if (arguments.length == 2) {
            return arguments[1].evaluate(c).string();
        }
        throw new Error("Function string expects (object?)");
    };

    Functions.concat = function (c) {
        if (arguments.length < 3) {
            throw new Error("Function concat expects (string, string[, string]*)");
        }
        var s = "";
        for (var i = 1; i < arguments.length; i++) {
            s += arguments[i].evaluate(c).stringValue();
        }
        return new XString(s);
    };

    Functions.startsWith = function () {
        var c = arguments[0];
        if (arguments.length != 3) {
            throw new Error("Function startsWith expects (string, string)");
        }
        var s1 = arguments[1].evaluate(c).stringValue();
        var s2 = arguments[2].evaluate(c).stringValue();
        return new XBoolean(s1.substring(0, s2.length) == s2);
    };

    Functions.contains = function () {
        var c = arguments[0];
        if (arguments.length != 3) {
            throw new Error("Function contains expects (string, string)");
        }
        var s1 = arguments[1].evaluate(c).stringValue();
        var s2 = arguments[2].evaluate(c).stringValue();
        return new XBoolean(s1.indexOf(s2) !== -1);
    };

    Functions.substringBefore = function () {
        var c = arguments[0];
        if (arguments.length != 3) {
            throw new Error("Function substring-before expects (string, string)");
        }
        var s1 = arguments[1].evaluate(c).stringValue();
        var s2 = arguments[2].evaluate(c).stringValue();
        return new XString(s1.substring(0, s1.indexOf(s2)));
    };

    Functions.substringAfter = function () {
        var c = arguments[0];
        if (arguments.length != 3) {
            throw new Error("Function substring-after expects (string, string)");
        }
        var s1 = arguments[1].evaluate(c).stringValue();
        var s2 = arguments[2].evaluate(c).stringValue();
        if (s2.length == 0) {
            return new XString(s1);
        }
        var i = s1.indexOf(s2);
        if (i == -1) {
            return new XString("");
        }
        return new XString(s1.substring(i + s2.length));
    };

    Functions.substring = function () {
        var c = arguments[0];
        if (!(arguments.length == 3 || arguments.length == 4)) {
            throw new Error("Function substring expects (string, number, number?)");
        }
        var s = arguments[1].evaluate(c).stringValue();
        var n1 = Math.round(arguments[2].evaluate(c).numberValue()) - 1;
        var n2 = arguments.length == 4 ? n1 + Math.round(arguments[3].evaluate(c).numberValue()) : undefined;
        return new XString(s.substring(n1, n2));
    };

    Functions.stringLength = function () {
        var c = arguments[0];
        var s;
        if (arguments.length == 1) {
            s = XNodeSet.prototype.stringForNode(c.contextNode);
        } else if (arguments.length == 2) {
            s = arguments[1].evaluate(c).stringValue();
        } else {
            throw new Error("Function string-length expects (string?)");
        }
        return new XNumber(s.length);
    };

    Functions.normalizeSpace = function () {
        var c = arguments[0];
        var s;
        if (arguments.length == 1) {
            s = XNodeSet.prototype.stringForNode(c.contextNode);
        } else if (arguments.length == 2) {
            s = arguments[1].evaluate(c).stringValue();
        } else {
            throw new Error("Function normalize-space expects (string?)");
        }
        var i = 0;
        var j = s.length - 1;
        while (Utilities.isSpace(s.charCodeAt(j))) {
            j--;
        }
        var t = "";
        while (i <= j && Utilities.isSpace(s.charCodeAt(i))) {
            i++;
        }
        while (i <= j) {
            if (Utilities.isSpace(s.charCodeAt(i))) {
                t += " ";
                while (i <= j && Utilities.isSpace(s.charCodeAt(i))) {
                    i++;
                }
            } else {
                t += s.charAt(i);
                i++;
            }
        }
        return new XString(t);
    };

    Functions.translate = function (c, eValue, eFrom, eTo) {
        if (arguments.length != 4) {
            throw new Error("Function translate expects (string, string, string)");
        }

        var value = eValue.evaluate(c).stringValue();
        var from = eFrom.evaluate(c).stringValue();
        var to = eTo.evaluate(c).stringValue();

        var cMap = reduce(function (acc, ch, i) {
            if (!(ch in acc)) {
                acc[ch] = i > to.length ? '' : to[i];
            }
            return acc;
        }, {}, from);

        var t = join(
            '',
            map(function (ch) {
                return ch in cMap ? cMap[ch] : ch;
            }, value)
        );

        return new XString(t);
    };

    Functions.boolean_ = function () {
        var c = arguments[0];
        if (arguments.length != 2) {
            throw new Error("Function boolean expects (object)");
        }
        return arguments[1].evaluate(c).bool();
    };

    Functions.not = function (c, eValue) {
        if (arguments.length != 2) {
            throw new Error("Function not expects (object)");
        }
        return eValue.evaluate(c).bool().not();
    };

    Functions.true_ = function () {
        if (arguments.length != 1) {
            throw new Error("Function true expects ()");
        }
        return XBoolean.true_;
    };

    Functions.false_ = function () {
        if (arguments.length != 1) {
            throw new Error("Function false expects ()");
        }
        return XBoolean.false_;
    };

    Functions.lang = function () {
        var c = arguments[0];
        if (arguments.length != 2) {
            throw new Error("Function lang expects (string)");
        }
        var lang;
        for (var n = c.contextNode; n != null && n.nodeType != 9 /*Node.DOCUMENT_NODE*/; n = n.parentNode) {
            var a = n.getAttributeNS(XPath.XML_NAMESPACE_URI, "lang");
            if (a != null) {
                lang = String(a);
                break;
            }
        }
        if (lang == null) {
            return XBoolean.false_;
        }
        var s = arguments[1].evaluate(c).stringValue();
        return new XBoolean(lang.substring(0, s.length) == s
            && (lang.length == s.length || lang.charAt(s.length) == '-'));
    };

    Functions.number = function () {
        var c = arguments[0];
        if (!(arguments.length == 1 || arguments.length == 2)) {
            throw new Error("Function number expects (object?)");
        }
        if (arguments.length == 1) {
            return new XNumber(XNodeSet.prototype.stringForNode(c.contextNode));
        }
        return arguments[1].evaluate(c).number();
    };

    Functions.sum = function () {
        var c = arguments[0];
        var ns;
        if (arguments.length != 2 || !Utilities.instance_of((ns = arguments[1].evaluate(c)), XNodeSet)) {
            throw new Error("Function sum expects (node-set)");
        }
        ns = ns.toUnsortedArray();
        var n = 0;
        for (var i = 0; i < ns.length; i++) {
            n += new XNumber(XNodeSet.prototype.stringForNode(ns[i])).numberValue();
        }
        return new XNumber(n);
    };

    Functions.floor = function () {
        var c = arguments[0];
        if (arguments.length != 2) {
            throw new Error("Function floor expects (number)");
        }
        return new XNumber(Math.floor(arguments[1].evaluate(c).numberValue()));
    };

    Functions.ceiling = function () {
        var c = arguments[0];
        if (arguments.length != 2) {
            throw new Error("Function ceiling expects (number)");
        }
        return new XNumber(Math.ceil(arguments[1].evaluate(c).numberValue()));
    };

    Functions.round = function () {
        var c = arguments[0];
        if (arguments.length != 2) {
            throw new Error("Function round expects (number)");
        }
        return new XNumber(Math.round(arguments[1].evaluate(c).numberValue()));
    };

    // Utilities /////////////////////////////////////////////////////////////////

    var Utilities = new Object();

    Utilities.isAttribute = function (val) {
        return val && (val.nodeType === 2 || val.ownerElement);
    }

    Utilities.splitQName = function (qn) {
        var i = qn.indexOf(":");
        if (i == -1) {
            return [null, qn];
        }
        return [qn.substring(0, i), qn.substring(i + 1)];
    };

    Utilities.resolveQName = function (qn, nr, n, useDefault) {
        var parts = Utilities.splitQName(qn);
        if (parts[0] != null) {
            parts[0] = nr.getNamespace(parts[0], n);
        } else {
            if (useDefault) {
                parts[0] = nr.getNamespace("", n);
                if (parts[0] == null) {
                    parts[0] = "";
                }
            } else {
                parts[0] = "";
            }
        }
        return parts;
    };

    Utilities.isSpace = function (c) {
        return c == 0x9 || c == 0xd || c == 0xa || c == 0x20;
    };

    Utilities.isLetter = function (c) {
        return c >= 0x0041 && c <= 0x005A ||
            c >= 0x0061 && c <= 0x007A ||
            c >= 0x00C0 && c <= 0x00D6 ||
            c >= 0x00D8 && c <= 0x00F6 ||
            c >= 0x00F8 && c <= 0x00FF ||
            c >= 0x0100 && c <= 0x0131 ||
            c >= 0x0134 && c <= 0x013E ||
            c >= 0x0141 && c <= 0x0148 ||
            c >= 0x014A && c <= 0x017E ||
            c >= 0x0180 && c <= 0x01C3 ||
            c >= 0x01CD && c <= 0x01F0 ||
            c >= 0x01F4 && c <= 0x01F5 ||
            c >= 0x01FA && c <= 0x0217 ||
            c >= 0x0250 && c <= 0x02A8 ||
            c >= 0x02BB && c <= 0x02C1 ||
            c == 0x0386 ||
            c >= 0x0388 && c <= 0x038A ||
            c == 0x038C ||
            c >= 0x038E && c <= 0x03A1 ||
            c >= 0x03A3 && c <= 0x03CE ||
            c >= 0x03D0 && c <= 0x03D6 ||
            c == 0x03DA ||
            c == 0x03DC ||
            c == 0x03DE ||
            c == 0x03E0 ||
            c >= 0x03E2 && c <= 0x03F3 ||
            c >= 0x0401 && c <= 0x040C ||
            c >= 0x040E && c <= 0x044F ||
            c >= 0x0451 && c <= 0x045C ||
            c >= 0x045E && c <= 0x0481 ||
            c >= 0x0490 && c <= 0x04C4 ||
            c >= 0x04C7 && c <= 0x04C8 ||
            c >= 0x04CB && c <= 0x04CC ||
            c >= 0x04D0 && c <= 0x04EB ||
            c >= 0x04EE && c <= 0x04F5 ||
            c >= 0x04F8 && c <= 0x04F9 ||
            c >= 0x0531 && c <= 0x0556 ||
            c == 0x0559 ||
            c >= 0x0561 && c <= 0x0586 ||
            c >= 0x05D0 && c <= 0x05EA ||
            c >= 0x05F0 && c <= 0x05F2 ||
            c >= 0x0621 && c <= 0x063A ||
            c >= 0x0641 && c <= 0x064A ||
            c >= 0x0671 && c <= 0x06B7 ||
            c >= 0x06BA && c <= 0x06BE ||
            c >= 0x06C0 && c <= 0x06CE ||
            c >= 0x06D0 && c <= 0x06D3 ||
            c == 0x06D5 ||
            c >= 0x06E5 && c <= 0x06E6 ||
            c >= 0x0905 && c <= 0x0939 ||
            c == 0x093D ||
            c >= 0x0958 && c <= 0x0961 ||
            c >= 0x0985 && c <= 0x098C ||
            c >= 0x098F && c <= 0x0990 ||
            c >= 0x0993 && c <= 0x09A8 ||
            c >= 0x09AA && c <= 0x09B0 ||
            c == 0x09B2 ||
            c >= 0x09B6 && c <= 0x09B9 ||
            c >= 0x09DC && c <= 0x09DD ||
            c >= 0x09DF && c <= 0x09E1 ||
            c >= 0x09F0 && c <= 0x09F1 ||
            c >= 0x0A05 && c <= 0x0A0A ||
            c >= 0x0A0F && c <= 0x0A10 ||
            c >= 0x0A13 && c <= 0x0A28 ||
            c >= 0x0A2A && c <= 0x0A30 ||
            c >= 0x0A32 && c <= 0x0A33 ||
            c >= 0x0A35 && c <= 0x0A36 ||
            c >= 0x0A38 && c <= 0x0A39 ||
            c >= 0x0A59 && c <= 0x0A5C ||
            c == 0x0A5E ||
            c >= 0x0A72 && c <= 0x0A74 ||
            c >= 0x0A85 && c <= 0x0A8B ||
            c == 0x0A8D ||
            c >= 0x0A8F && c <= 0x0A91 ||
            c >= 0x0A93 && c <= 0x0AA8 ||
            c >= 0x0AAA && c <= 0x0AB0 ||
            c >= 0x0AB2 && c <= 0x0AB3 ||
            c >= 0x0AB5 && c <= 0x0AB9 ||
            c == 0x0ABD ||
            c == 0x0AE0 ||
            c >= 0x0B05 && c <= 0x0B0C ||
            c >= 0x0B0F && c <= 0x0B10 ||
            c >= 0x0B13 && c <= 0x0B28 ||
            c >= 0x0B2A && c <= 0x0B30 ||
            c >= 0x0B32 && c <= 0x0B33 ||
            c >= 0x0B36 && c <= 0x0B39 ||
            c == 0x0B3D ||
            c >= 0x0B5C && c <= 0x0B5D ||
            c >= 0x0B5F && c <= 0x0B61 ||
            c >= 0x0B85 && c <= 0x0B8A ||
            c >= 0x0B8E && c <= 0x0B90 ||
            c >= 0x0B92 && c <= 0x0B95 ||
            c >= 0x0B99 && c <= 0x0B9A ||
            c == 0x0B9C ||
            c >= 0x0B9E && c <= 0x0B9F ||
            c >= 0x0BA3 && c <= 0x0BA4 ||
            c >= 0x0BA8 && c <= 0x0BAA ||
            c >= 0x0BAE && c <= 0x0BB5 ||
            c >= 0x0BB7 && c <= 0x0BB9 ||
            c >= 0x0C05 && c <= 0x0C0C ||
            c >= 0x0C0E && c <= 0x0C10 ||
            c >= 0x0C12 && c <= 0x0C28 ||
            c >= 0x0C2A && c <= 0x0C33 ||
            c >= 0x0C35 && c <= 0x0C39 ||
            c >= 0x0C60 && c <= 0x0C61 ||
            c >= 0x0C85 && c <= 0x0C8C ||
            c >= 0x0C8E && c <= 0x0C90 ||
            c >= 0x0C92 && c <= 0x0CA8 ||
            c >= 0x0CAA && c <= 0x0CB3 ||
            c >= 0x0CB5 && c <= 0x0CB9 ||
            c == 0x0CDE ||
            c >= 0x0CE0 && c <= 0x0CE1 ||
            c >= 0x0D05 && c <= 0x0D0C ||
            c >= 0x0D0E && c <= 0x0D10 ||
            c >= 0x0D12 && c <= 0x0D28 ||
            c >= 0x0D2A && c <= 0x0D39 ||
            c >= 0x0D60 && c <= 0x0D61 ||
            c >= 0x0E01 && c <= 0x0E2E ||
            c == 0x0E30 ||
            c >= 0x0E32 && c <= 0x0E33 ||
            c >= 0x0E40 && c <= 0x0E45 ||
            c >= 0x0E81 && c <= 0x0E82 ||
            c == 0x0E84 ||
            c >= 0x0E87 && c <= 0x0E88 ||
            c == 0x0E8A ||
            c == 0x0E8D ||
            c >= 0x0E94 && c <= 0x0E97 ||
            c >= 0x0E99 && c <= 0x0E9F ||
            c >= 0x0EA1 && c <= 0x0EA3 ||
            c == 0x0EA5 ||
            c == 0x0EA7 ||
            c >= 0x0EAA && c <= 0x0EAB ||
            c >= 0x0EAD && c <= 0x0EAE ||
            c == 0x0EB0 ||
            c >= 0x0EB2 && c <= 0x0EB3 ||
            c == 0x0EBD ||
            c >= 0x0EC0 && c <= 0x0EC4 ||
            c >= 0x0F40 && c <= 0x0F47 ||
            c >= 0x0F49 && c <= 0x0F69 ||
            c >= 0x10A0 && c <= 0x10C5 ||
            c >= 0x10D0 && c <= 0x10F6 ||
            c == 0x1100 ||
            c >= 0x1102 && c <= 0x1103 ||
            c >= 0x1105 && c <= 0x1107 ||
            c == 0x1109 ||
            c >= 0x110B && c <= 0x110C ||
            c >= 0x110E && c <= 0x1112 ||
            c == 0x113C ||
            c == 0x113E ||
            c == 0x1140 ||
            c == 0x114C ||
            c == 0x114E ||
            c == 0x1150 ||
            c >= 0x1154 && c <= 0x1155 ||
            c == 0x1159 ||
            c >= 0x115F && c <= 0x1161 ||
            c == 0x1163 ||
            c == 0x1165 ||
            c == 0x1167 ||
            c == 0x1169 ||
            c >= 0x116D && c <= 0x116E ||
            c >= 0x1172 && c <= 0x1173 ||
            c == 0x1175 ||
            c == 0x119E ||
            c == 0x11A8 ||
            c == 0x11AB ||
            c >= 0x11AE && c <= 0x11AF ||
            c >= 0x11B7 && c <= 0x11B8 ||
            c == 0x11BA ||
            c >= 0x11BC && c <= 0x11C2 ||
            c == 0x11EB ||
            c == 0x11F0 ||
            c == 0x11F9 ||
            c >= 0x1E00 && c <= 0x1E9B ||
            c >= 0x1EA0 && c <= 0x1EF9 ||
            c >= 0x1F00 && c <= 0x1F15 ||
            c >= 0x1F18 && c <= 0x1F1D ||
            c >= 0x1F20 && c <= 0x1F45 ||
            c >= 0x1F48 && c <= 0x1F4D ||
            c >= 0x1F50 && c <= 0x1F57 ||
            c == 0x1F59 ||
            c == 0x1F5B ||
            c == 0x1F5D ||
            c >= 0x1F5F && c <= 0x1F7D ||
            c >= 0x1F80 && c <= 0x1FB4 ||
            c >= 0x1FB6 && c <= 0x1FBC ||
            c == 0x1FBE ||
            c >= 0x1FC2 && c <= 0x1FC4 ||
            c >= 0x1FC6 && c <= 0x1FCC ||
            c >= 0x1FD0 && c <= 0x1FD3 ||
            c >= 0x1FD6 && c <= 0x1FDB ||
            c >= 0x1FE0 && c <= 0x1FEC ||
            c >= 0x1FF2 && c <= 0x1FF4 ||
            c >= 0x1FF6 && c <= 0x1FFC ||
            c == 0x2126 ||
            c >= 0x212A && c <= 0x212B ||
            c == 0x212E ||
            c >= 0x2180 && c <= 0x2182 ||
            c >= 0x3041 && c <= 0x3094 ||
            c >= 0x30A1 && c <= 0x30FA ||
            c >= 0x3105 && c <= 0x312C ||
            c >= 0xAC00 && c <= 0xD7A3 ||
            c >= 0x4E00 && c <= 0x9FA5 ||
            c == 0x3007 ||
            c >= 0x3021 && c <= 0x3029;
    };

    Utilities.isNCNameChar = function (c) {
        return c >= 0x0030 && c <= 0x0039
            || c >= 0x0660 && c <= 0x0669
            || c >= 0x06F0 && c <= 0x06F9
            || c >= 0x0966 && c <= 0x096F
            || c >= 0x09E6 && c <= 0x09EF
            || c >= 0x0A66 && c <= 0x0A6F
            || c >= 0x0AE6 && c <= 0x0AEF
            || c >= 0x0B66 && c <= 0x0B6F
            || c >= 0x0BE7 && c <= 0x0BEF
            || c >= 0x0C66 && c <= 0x0C6F
            || c >= 0x0CE6 && c <= 0x0CEF
            || c >= 0x0D66 && c <= 0x0D6F
            || c >= 0x0E50 && c <= 0x0E59
            || c >= 0x0ED0 && c <= 0x0ED9
            || c >= 0x0F20 && c <= 0x0F29
            || c == 0x002E
            || c == 0x002D
            || c == 0x005F
            || Utilities.isLetter(c)
            || c >= 0x0300 && c <= 0x0345
            || c >= 0x0360 && c <= 0x0361
            || c >= 0x0483 && c <= 0x0486
            || c >= 0x0591 && c <= 0x05A1
            || c >= 0x05A3 && c <= 0x05B9
            || c >= 0x05BB && c <= 0x05BD
            || c == 0x05BF
            || c >= 0x05C1 && c <= 0x05C2
            || c == 0x05C4
            || c >= 0x064B && c <= 0x0652
            || c == 0x0670
            || c >= 0x06D6 && c <= 0x06DC
            || c >= 0x06DD && c <= 0x06DF
            || c >= 0x06E0 && c <= 0x06E4
            || c >= 0x06E7 && c <= 0x06E8
            || c >= 0x06EA && c <= 0x06ED
            || c >= 0x0901 && c <= 0x0903
            || c == 0x093C
            || c >= 0x093E && c <= 0x094C
            || c == 0x094D
            || c >= 0x0951 && c <= 0x0954
            || c >= 0x0962 && c <= 0x0963
            || c >= 0x0981 && c <= 0x0983
            || c == 0x09BC
            || c == 0x09BE
            || c == 0x09BF
            || c >= 0x09C0 && c <= 0x09C4
            || c >= 0x09C7 && c <= 0x09C8
            || c >= 0x09CB && c <= 0x09CD
            || c == 0x09D7
            || c >= 0x09E2 && c <= 0x09E3
            || c == 0x0A02
            || c == 0x0A3C
            || c == 0x0A3E
            || c == 0x0A3F
            || c >= 0x0A40 && c <= 0x0A42
            || c >= 0x0A47 && c <= 0x0A48
            || c >= 0x0A4B && c <= 0x0A4D
            || c >= 0x0A70 && c <= 0x0A71
            || c >= 0x0A81 && c <= 0x0A83
            || c == 0x0ABC
            || c >= 0x0ABE && c <= 0x0AC5
            || c >= 0x0AC7 && c <= 0x0AC9
            || c >= 0x0ACB && c <= 0x0ACD
            || c >= 0x0B01 && c <= 0x0B03
            || c == 0x0B3C
            || c >= 0x0B3E && c <= 0x0B43
            || c >= 0x0B47 && c <= 0x0B48
            || c >= 0x0B4B && c <= 0x0B4D
            || c >= 0x0B56 && c <= 0x0B57
            || c >= 0x0B82 && c <= 0x0B83
            || c >= 0x0BBE && c <= 0x0BC2
            || c >= 0x0BC6 && c <= 0x0BC8
            || c >= 0x0BCA && c <= 0x0BCD
            || c == 0x0BD7
            || c >= 0x0C01 && c <= 0x0C03
            || c >= 0x0C3E && c <= 0x0C44
            || c >= 0x0C46 && c <= 0x0C48
            || c >= 0x0C4A && c <= 0x0C4D
            || c >= 0x0C55 && c <= 0x0C56
            || c >= 0x0C82 && c <= 0x0C83
            || c >= 0x0CBE && c <= 0x0CC4
            || c >= 0x0CC6 && c <= 0x0CC8
            || c >= 0x0CCA && c <= 0x0CCD
            || c >= 0x0CD5 && c <= 0x0CD6
            || c >= 0x0D02 && c <= 0x0D03
            || c >= 0x0D3E && c <= 0x0D43
            || c >= 0x0D46 && c <= 0x0D48
            || c >= 0x0D4A && c <= 0x0D4D
            || c == 0x0D57
            || c == 0x0E31
            || c >= 0x0E34 && c <= 0x0E3A
            || c >= 0x0E47 && c <= 0x0E4E
            || c == 0x0EB1
            || c >= 0x0EB4 && c <= 0x0EB9
            || c >= 0x0EBB && c <= 0x0EBC
            || c >= 0x0EC8 && c <= 0x0ECD
            || c >= 0x0F18 && c <= 0x0F19
            || c == 0x0F35
            || c == 0x0F37
            || c == 0x0F39
            || c == 0x0F3E
            || c == 0x0F3F
            || c >= 0x0F71 && c <= 0x0F84
            || c >= 0x0F86 && c <= 0x0F8B
            || c >= 0x0F90 && c <= 0x0F95
            || c == 0x0F97
            || c >= 0x0F99 && c <= 0x0FAD
            || c >= 0x0FB1 && c <= 0x0FB7
            || c == 0x0FB9
            || c >= 0x20D0 && c <= 0x20DC
            || c == 0x20E1
            || c >= 0x302A && c <= 0x302F
            || c == 0x3099
            || c == 0x309A
            || c == 0x00B7
            || c == 0x02D0
            || c == 0x02D1
            || c == 0x0387
            || c == 0x0640
            || c == 0x0E46
            || c == 0x0EC6
            || c == 0x3005
            || c >= 0x3031 && c <= 0x3035
            || c >= 0x309D && c <= 0x309E
            || c >= 0x30FC && c <= 0x30FE;
    };

    Utilities.coalesceText = function (n) {
        for (var m = n.firstChild; m != null; m = m.nextSibling) {
            if (m.nodeType == 3 /*Node.TEXT_NODE*/ || m.nodeType == 4 /*Node.CDATA_SECTION_NODE*/) {
                var s = m.nodeValue;
                var first = m;
                m = m.nextSibling;
                while (m != null && (m.nodeType == 3 /*Node.TEXT_NODE*/ || m.nodeType == 4 /*Node.CDATA_SECTION_NODE*/)) {
                    s += m.nodeValue;
                    var del = m;
                    m = m.nextSibling;
                    del.parentNode.removeChild(del);
                }
                if (first.nodeType == 4 /*Node.CDATA_SECTION_NODE*/) {
                    var p = first.parentNode;
                    if (first.nextSibling == null) {
                        p.removeChild(first);
                        p.appendChild(p.ownerDocument.createTextNode(s));
                    } else {
                        var next = first.nextSibling;
                        p.removeChild(first);
                        p.insertBefore(p.ownerDocument.createTextNode(s), next);
                    }
                } else {
                    first.nodeValue = s;
                }
                if (m == null) {
                    break;
                }
            } else if (m.nodeType == 1 /*Node.ELEMENT_NODE*/) {
                Utilities.coalesceText(m);
            }
        }
    };

    Utilities.instance_of = function (o, c) {
        while (o != null) {
            if (o.constructor === c) {
                return true;
            }
            if (o === Object) {
                return false;
            }
            o = o.constructor.superclass;
        }
        return false;
    };

    Utilities.getElementById = function (n, id) {
        // Note that this does not check the DTD to check for actual
        // attributes of type ID, so this may be a bit wrong.
        if (n.nodeType == 1 /*Node.ELEMENT_NODE*/) {
            if (n.getAttribute("id") == id
                || n.getAttributeNS(null, "id") == id) {
                return n;
            }
        }
        for (var m = n.firstChild; m != null; m = m.nextSibling) {
            var res = Utilities.getElementById(m, id);
            if (res != null) {
                return res;
            }
        }
        return null;
    };

    // XPathException ////////////////////////////////////////////////////////////

    var XPathException = (function () {
        function getMessage(code, exception) {
            var msg = exception ? ": " + exception.toString() : "";
            switch (code) {
                case XPathException.INVALID_EXPRESSION_ERR:
                    return "Invalid expression" + msg;
                case XPathException.TYPE_ERR:
                    return "Type error" + msg;
            }
            return null;
        }

        function XPathException(code, error, message) {
            var err = Error.call(this, getMessage(code, error) || message);

            err.code = code;
            err.exception = error;

            return err;
        }

        XPathException.prototype = Object.create(Error.prototype);
        XPathException.prototype.constructor = XPathException;
        XPathException.superclass = Error;

        XPathException.prototype.toString = function () {
            return this.message;
        };

        XPathException.fromMessage = function (message, error) {
            return new XPathException(null, error, message);
        };

        XPathException.INVALID_EXPRESSION_ERR = 51;
        XPathException.TYPE_ERR = 52;

        return XPathException;
    })();

    // XPathExpression ///////////////////////////////////////////////////////////

    XPathExpression.prototype = {};
    XPathExpression.prototype.constructor = XPathExpression;
    XPathExpression.superclass = Object.prototype;

    function XPathExpression(e, r, p) {
        this.xpath = p.parse(e);
        this.context = new XPathContext();
        this.context.namespaceResolver = new XPathNSResolverWrapper(r);
    }

    XPathExpression.getOwnerDocument = function (n) {
        return n.nodeType === 9 /*Node.DOCUMENT_NODE*/ ? n : n.ownerDocument;
    }

    XPathExpression.detectHtmlDom = function (n) {
        if (!n) { return false; }

        var doc = XPathExpression.getOwnerDocument(n);

        try {
            return doc.implementation.hasFeature("HTML", "2.0");
        } catch (e) {
            return true;
        }
    }

    XPathExpression.prototype.evaluate = function (n, t, res) {
        this.context.expressionContextNode = n;
        // backward compatibility - no reliable way to detect whether the DOM is HTML, but
        // this library has been using this method up until now, so we will continue to use it
        // ONLY when using an XPathExpression
        this.context.caseInsensitive = XPathExpression.detectHtmlDom(n);

        var result = this.xpath.evaluate(this.context);
        return new XPathResult(result, t);
    }

    // XPathNSResolverWrapper ////////////////////////////////////////////////////

    XPathNSResolverWrapper.prototype = {};
    XPathNSResolverWrapper.prototype.constructor = XPathNSResolverWrapper;
    XPathNSResolverWrapper.superclass = Object.prototype;

    function XPathNSResolverWrapper(r) {
        this.xpathNSResolver = r;
    }

    XPathNSResolverWrapper.prototype.getNamespace = function (prefix, n) {
        if (this.xpathNSResolver == null) {
            return null;
        }
        return this.xpathNSResolver.lookupNamespaceURI(prefix);
    };

    // NodeXPathNSResolver ///////////////////////////////////////////////////////

    NodeXPathNSResolver.prototype = {};
    NodeXPathNSResolver.prototype.constructor = NodeXPathNSResolver;
    NodeXPathNSResolver.superclass = Object.prototype;

    function NodeXPathNSResolver(n) {
        this.node = n;
        this.namespaceResolver = new NamespaceResolver();
    }

    NodeXPathNSResolver.prototype.lookupNamespaceURI = function (prefix) {
        return this.namespaceResolver.getNamespace(prefix, this.node);
    };

    // XPathResult ///////////////////////////////////////////////////////////////

    XPathResult.prototype = {};
    XPathResult.prototype.constructor = XPathResult;
    XPathResult.superclass = Object.prototype;

    function XPathResult(v, t) {
        if (t == XPathResult.ANY_TYPE) {
            if (v.constructor === XString) {
                t = XPathResult.STRING_TYPE;
            } else if (v.constructor === XNumber) {
                t = XPathResult.NUMBER_TYPE;
            } else if (v.constructor === XBoolean) {
                t = XPathResult.BOOLEAN_TYPE;
            } else if (v.constructor === XNodeSet) {
                t = XPathResult.UNORDERED_NODE_ITERATOR_TYPE;
            }
        }
        this.resultType = t;
        switch (t) {
            case XPathResult.NUMBER_TYPE:
                this.numberValue = v.numberValue();
                return;
            case XPathResult.STRING_TYPE:
                this.stringValue = v.stringValue();
                return;
            case XPathResult.BOOLEAN_TYPE:
                this.booleanValue = v.booleanValue();
                return;
            case XPathResult.ANY_UNORDERED_NODE_TYPE:
            case XPathResult.FIRST_ORDERED_NODE_TYPE:
                if (v.constructor === XNodeSet) {
                    this.singleNodeValue = v.first();
                    return;
                }
                break;
            case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
            case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
                if (v.constructor === XNodeSet) {
                    this.invalidIteratorState = false;
                    this.nodes = v.toArray();
                    this.iteratorIndex = 0;
                    return;
                }
                break;
            case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
            case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
                if (v.constructor === XNodeSet) {
                    this.nodes = v.toArray();
                    this.snapshotLength = this.nodes.length;
                    return;
                }
                break;
        }
        throw new XPathException(XPathException.TYPE_ERR);
    };

    XPathResult.prototype.iterateNext = function () {
        if (this.resultType != XPathResult.UNORDERED_NODE_ITERATOR_TYPE
            && this.resultType != XPathResult.ORDERED_NODE_ITERATOR_TYPE) {
            throw new XPathException(XPathException.TYPE_ERR);
        }
        return this.nodes[this.iteratorIndex++];
    };

    XPathResult.prototype.snapshotItem = function (i) {
        if (this.resultType != XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE
            && this.resultType != XPathResult.ORDERED_NODE_SNAPSHOT_TYPE) {
            throw new XPathException(XPathException.TYPE_ERR);
        }
        return this.nodes[i];
    };

    XPathResult.ANY_TYPE = 0;
    XPathResult.NUMBER_TYPE = 1;
    XPathResult.STRING_TYPE = 2;
    XPathResult.BOOLEAN_TYPE = 3;
    XPathResult.UNORDERED_NODE_ITERATOR_TYPE = 4;
    XPathResult.ORDERED_NODE_ITERATOR_TYPE = 5;
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE = 6;
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE = 7;
    XPathResult.ANY_UNORDERED_NODE_TYPE = 8;
    XPathResult.FIRST_ORDERED_NODE_TYPE = 9;

    // DOM 3 XPath support ///////////////////////////////////////////////////////

    function installDOM3XPathSupport(doc, p) {
        doc.createExpression = function (e, r) {
            try {
                return new XPathExpression(e, r, p);
            } catch (e) {
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, e);
            }
        };
        doc.createNSResolver = function (n) {
            return new NodeXPathNSResolver(n);
        };
        doc.evaluate = function (e, cn, r, t, res) {
            if (t < 0 || t > 9) {
                throw { code: 0, toString: function () { return "Request type not supported"; } };
            }
            return doc.createExpression(e, r, p).evaluate(cn, t, res);
        };
    };

    // ---------------------------------------------------------------------------

    // Install DOM 3 XPath support for the current document.
    try {
        var shouldInstall = true;
        try {
            if (document.implementation
                && document.implementation.hasFeature
                && document.implementation.hasFeature("XPath", null)) {
                shouldInstall = false;
            }
        } catch (e) {
        }
        if (shouldInstall) {
            installDOM3XPathSupport(document, new XPathParser());
        }
    } catch (e) {
    }

    // ---------------------------------------------------------------------------
    // exports for node.js

    installDOM3XPathSupport(exports, new XPathParser());

    (function () {
        var parser = new XPathParser();

        var defaultNSResolver = new NamespaceResolver();
        var defaultFunctionResolver = new FunctionResolver();
        var defaultVariableResolver = new VariableResolver();

        function makeNSResolverFromFunction(func) {
            return {
                getNamespace: function (prefix, node) {
                    var ns = func(prefix, node);

                    return ns || defaultNSResolver.getNamespace(prefix, node);
                }
            };
        }

        function makeNSResolverFromObject(obj) {
            return makeNSResolverFromFunction(obj.getNamespace.bind(obj));
        }

        function makeNSResolverFromMap(map) {
            return makeNSResolverFromFunction(function (prefix) {
                return map[prefix];
            });
        }

        function makeNSResolver(resolver) {
            if (resolver && typeof resolver.getNamespace === "function") {
                return makeNSResolverFromObject(resolver);
            }

            if (typeof resolver === "function") {
                return makeNSResolverFromFunction(resolver);
            }

            // assume prefix -> uri mapping
            if (typeof resolver === "object") {
                return makeNSResolverFromMap(resolver);
            }

            return defaultNSResolver;
        }

        /** Converts native JavaScript types to their XPath library equivalent */
        function convertValue(value) {
            if (value === null ||
                typeof value === "undefined" ||
                value instanceof XString ||
                value instanceof XBoolean ||
                value instanceof XNumber ||
                value instanceof XNodeSet) {
                return value;
            }

            switch (typeof value) {
                case "string": return new XString(value);
                case "boolean": return new XBoolean(value);
                case "number": return new XNumber(value);
            }

            // assume node(s)
            var ns = new XNodeSet();
            ns.addArray([].concat(value));
            return ns;
        }

        function makeEvaluator(func) {
            return function (context) {
                var args = Array.prototype.slice.call(arguments, 1).map(function (arg) {
                    return arg.evaluate(context);
                });
                var result = func.apply(this, [].concat(context, args));
                return convertValue(result);
            };
        }

        function makeFunctionResolverFromFunction(func) {
            return {
                getFunction: function (name, namespace) {
                    var found = func(name, namespace);
                    if (found) {
                        return makeEvaluator(found);
                    }
                    return defaultFunctionResolver.getFunction(name, namespace);
                }
            };
        }

        function makeFunctionResolverFromObject(obj) {
            return makeFunctionResolverFromFunction(obj.getFunction.bind(obj));
        }

        function makeFunctionResolverFromMap(map) {
            return makeFunctionResolverFromFunction(function (name) {
                return map[name];
            });
        }

        function makeFunctionResolver(resolver) {
            if (resolver && typeof resolver.getFunction === "function") {
                return makeFunctionResolverFromObject(resolver);
            }

            if (typeof resolver === "function") {
                return makeFunctionResolverFromFunction(resolver);
            }

            // assume map
            if (typeof resolver === "object") {
                return makeFunctionResolverFromMap(resolver);
            }

            return defaultFunctionResolver;
        }

        function makeVariableResolverFromFunction(func) {
            return {
                getVariable: function (name, namespace) {
                    var value = func(name, namespace);
                    return convertValue(value);
                }
            };
        }

        function makeVariableResolver(resolver) {
            if (resolver) {
                if (typeof resolver.getVariable === "function") {
                    return makeVariableResolverFromFunction(resolver.getVariable.bind(resolver));
                }

                if (typeof resolver === "function") {
                    return makeVariableResolverFromFunction(resolver);
                }

                // assume map
                if (typeof resolver === "object") {
                    return makeVariableResolverFromFunction(function (name) {
                        return resolver[name];
                    });
                }
            }

            return defaultVariableResolver;
        }

        function copyIfPresent(prop, dest, source) {
            if (prop in source) { dest[prop] = source[prop]; }
        }

        function makeContext(options) {
            var context = new XPathContext();

            if (options) {
                context.namespaceResolver = makeNSResolver(options.namespaces);
                context.functionResolver = makeFunctionResolver(options.functions);
                context.variableResolver = makeVariableResolver(options.variables);
                context.expressionContextNode = options.node;
                copyIfPresent('allowAnyNamespaceForNoPrefix', context, options);
                copyIfPresent('isHtml', context, options);
            } else {
                context.namespaceResolver = defaultNSResolver;
            }

            return context;
        }

        function evaluate(parsedExpression, options) {
            var context = makeContext(options);

            return parsedExpression.evaluate(context);
        }

        var evaluatorPrototype = {
            evaluate: function (options) {
                return evaluate(this.expression, options);
            }

            , evaluateNumber: function (options) {
                return this.evaluate(options).numberValue();
            }

            , evaluateString: function (options) {
                return this.evaluate(options).stringValue();
            }

            , evaluateBoolean: function (options) {
                return this.evaluate(options).booleanValue();
            }

            , evaluateNodeSet: function (options) {
                return this.evaluate(options).nodeset();
            }

            , select: function (options) {
                return this.evaluateNodeSet(options).toArray()
            }

            , select1: function (options) {
                return this.select(options)[0];
            }
        };

        function parse(xpath) {
            var parsed = parser.parse(xpath);

            return Object.create(evaluatorPrototype, {
                expression: {
                    value: parsed
                }
            });
        }

        exports.parse = parse;
    })();

    assign(
        exports,
        {
            XPath,
            XPathParser,
            XPathResult,

            Step,
            PathExpr,
            NodeTest,
            LocationPath,

            OrOperation,
            AndOperation,

            BarOperation,

            EqualsOperation,
            NotEqualOperation,
            LessThanOperation,
            GreaterThanOperation,
            LessThanOrEqualOperation,
            GreaterThanOrEqualOperation,

            PlusOperation,
            MinusOperation,
            MultiplyOperation,
            DivOperation,
            ModOperation,
            UnaryMinusOperation,

            FunctionCall,
            VariableReference,

            XPathContext,

            XNodeSet,
            XBoolean,
            XString,
            XNumber,

            NamespaceResolver,
            FunctionResolver,
            VariableResolver,

            Utilities,
        }
    );

    // helper
    exports.select = function (e, doc, single) {
        return exports.selectWithResolver(e, doc, null, single);
    };

    exports.useNamespaces = function (mappings) {
        var resolver = {
            mappings: mappings || {},
            lookupNamespaceURI: function (prefix) {
                return this.mappings[prefix];
            }
        };

        return function (e, doc, single) {
            return exports.selectWithResolver(e, doc, resolver, single);
        };
    };

    exports.selectWithResolver = function (e, doc, resolver, single) {
        var expression = new XPathExpression(e, resolver, new XPathParser());
        var type = XPathResult.ANY_TYPE;

        var result = expression.evaluate(doc, type, null);

        if (result.resultType == XPathResult.STRING_TYPE) {
            result = result.stringValue;
        }
        else if (result.resultType == XPathResult.NUMBER_TYPE) {
            result = result.numberValue;
        }
        else if (result.resultType == XPathResult.BOOLEAN_TYPE) {
            result = result.booleanValue;
        }
        else {
            result = result.nodes;
            if (single) {
                result = result[0];
            }
        }

        return result;
    };

    exports.select1 = function (e, doc) {
        return exports.select(e, doc, true);
    };

    // end non-node wrapper
})(xpath);


/***/ }),

/***/ 322:
/***/ (function(module) {

module.exports = {
  "version": "0.23.0"
};

/***/ }),

/***/ 328:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var bind = __webpack_require__(65);

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is a Buffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a plain Object
 *
 * @param {Object} val The value to test
 * @return {boolean} True if value is a plain Object, otherwise false
 */
function isPlainObject(val) {
  if (toString.call(val) !== '[object Object]') {
    return false;
  }

  var prototype = Object.getPrototypeOf(val);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                           navigator.product === 'NativeScript' ||
                                           navigator.product === 'NS')) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val);
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val);
    } else if (isArray(val)) {
      result[key] = val.slice();
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 * @return {string} content value without BOM
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim,
  stripBOM: stripBOM
};


/***/ }),

/***/ 332:
/***/ (function(module, exports, __webpack_require__) {

/**
 * Module dependencies.
 */

const tty = __webpack_require__(867);
const util = __webpack_require__(669);

/**
 * This is the Node.js implementation of `debug()`.
 */

exports.init = init;
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.destroy = util.deprecate(
	() => {},
	'Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.'
);

/**
 * Colors.
 */

exports.colors = [6, 2, 3, 4, 5, 1];

try {
	// Optional dependency (as in, doesn't need to be installed, NOT like optionalDependencies in package.json)
	// eslint-disable-next-line import/no-extraneous-dependencies
	const supportsColor = __webpack_require__(318);

	if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
		exports.colors = [
			20,
			21,
			26,
			27,
			32,
			33,
			38,
			39,
			40,
			41,
			42,
			43,
			44,
			45,
			56,
			57,
			62,
			63,
			68,
			69,
			74,
			75,
			76,
			77,
			78,
			79,
			80,
			81,
			92,
			93,
			98,
			99,
			112,
			113,
			128,
			129,
			134,
			135,
			148,
			149,
			160,
			161,
			162,
			163,
			164,
			165,
			166,
			167,
			168,
			169,
			170,
			171,
			172,
			173,
			178,
			179,
			184,
			185,
			196,
			197,
			198,
			199,
			200,
			201,
			202,
			203,
			204,
			205,
			206,
			207,
			208,
			209,
			214,
			215,
			220,
			221
		];
	}
} catch (error) {
	// Swallow - we only care if `supports-color` is available; it doesn't have to be.
}

/**
 * Build up the default `inspectOpts` object from the environment variables.
 *
 *   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
 */

exports.inspectOpts = Object.keys(process.env).filter(key => {
	return /^debug_/i.test(key);
}).reduce((obj, key) => {
	// Camel-case
	const prop = key
		.substring(6)
		.toLowerCase()
		.replace(/_([a-z])/g, (_, k) => {
			return k.toUpperCase();
		});

	// Coerce string value into JS value
	let val = process.env[key];
	if (/^(yes|on|true|enabled)$/i.test(val)) {
		val = true;
	} else if (/^(no|off|false|disabled)$/i.test(val)) {
		val = false;
	} else if (val === 'null') {
		val = null;
	} else {
		val = Number(val);
	}

	obj[prop] = val;
	return obj;
}, {});

/**
 * Is stdout a TTY? Colored output is enabled when `true`.
 */

function useColors() {
	return 'colors' in exports.inspectOpts ?
		Boolean(exports.inspectOpts.colors) :
		tty.isatty(process.stderr.fd);
}

/**
 * Adds ANSI color escape codes if enabled.
 *
 * @api public
 */

function formatArgs(args) {
	const {namespace: name, useColors} = this;

	if (useColors) {
		const c = this.color;
		const colorCode = '\u001B[3' + (c < 8 ? c : '8;5;' + c);
		const prefix = `  ${colorCode};1m${name} \u001B[0m`;

		args[0] = prefix + args[0].split('\n').join('\n' + prefix);
		args.push(colorCode + 'm+' + module.exports.humanize(this.diff) + '\u001B[0m');
	} else {
		args[0] = getDate() + name + ' ' + args[0];
	}
}

function getDate() {
	if (exports.inspectOpts.hideDate) {
		return '';
	}
	return new Date().toISOString() + ' ';
}

/**
 * Invokes `util.format()` with the specified arguments and writes to stderr.
 */

function log(...args) {
	return process.stderr.write(util.format(...args) + '\n');
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	if (namespaces) {
		process.env.DEBUG = namespaces;
	} else {
		// If you set a process.env field to null or undefined, it gets cast to the
		// string 'null' or 'undefined'. Just delete instead.
		delete process.env.DEBUG;
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
	return process.env.DEBUG;
}

/**
 * Init logic for `debug` instances.
 *
 * Create a new `inspectOpts` object in case `useColors` is set
 * differently for a particular `debug` instance.
 */

function init(debug) {
	debug.inspectOpts = {};

	const keys = Object.keys(exports.inspectOpts);
	for (let i = 0; i < keys.length; i++) {
		debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
	}
}

module.exports = __webpack_require__(243)(exports);

const {formatters} = module.exports;

/**
 * Map %o to `util.inspect()`, all on a single line.
 */

formatters.o = function (v) {
	this.inspectOpts.colors = this.useColors;
	return util.inspect(v, this.inspectOpts)
		.split('\n')
		.map(str => str.trim())
		.join(' ');
};

/**
 * Map %O to `util.inspect()`, allowing multiple lines if needed.
 */

formatters.O = function (v) {
	this.inspectOpts.colors = this.useColors;
	return util.inspect(v, this.inspectOpts);
};


/***/ }),

/***/ 351:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issue = exports.issueCommand = void 0;
const os = __importStar(__webpack_require__(87));
const utils_1 = __webpack_require__(278);
/**
 * Commands
 *
 * Command Format:
 *   ::name key=value,key=value::message
 *
 * Examples:
 *   ::warning::This is the message
 *   ::set-env name=MY_VAR::some value
 */
function issueCommand(command, properties, message) {
    const cmd = new Command(command, properties, message);
    process.stdout.write(cmd.toString() + os.EOL);
}
exports.issueCommand = issueCommand;
function issue(name, message = '') {
    issueCommand(name, {}, message);
}
exports.issue = issue;
const CMD_STRING = '::';
class Command {
    constructor(command, properties, message) {
        if (!command) {
            command = 'missing.command';
        }
        this.command = command;
        this.properties = properties;
        this.message = message;
    }
    toString() {
        let cmdStr = CMD_STRING + this.command;
        if (this.properties && Object.keys(this.properties).length > 0) {
            cmdStr += ' ';
            let first = true;
            for (const key in this.properties) {
                if (this.properties.hasOwnProperty(key)) {
                    const val = this.properties[key];
                    if (val) {
                        if (first) {
                            first = false;
                        }
                        else {
                            cmdStr += ',';
                        }
                        cmdStr += `${key}=${escapeProperty(val)}`;
                    }
                }
            }
        }
        cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
        return cmdStr;
    }
}
function escapeData(s) {
    return utils_1.toCommandValue(s)
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A');
}
function escapeProperty(s) {
    return utils_1.toCommandValue(s)
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A')
        .replace(/:/g, '%3A')
        .replace(/,/g, '%2C');
}
//# sourceMappingURL=command.js.map

/***/ }),

/***/ 353:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GoogleTranslatorTokenFree = exports.GoogleTranslator = exports.AbstractGoogleTranslator = void 0;

var _axios = _interopRequireDefault(__webpack_require__(545));

var _queryString = __webpack_require__(293);

var _xpath = _interopRequireDefault(__webpack_require__(319));

var _xmldom = __webpack_require__(286);

var _Translator = __webpack_require__(778);

var _token = __webpack_require__(387);

var _utils = __webpack_require__(983);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var __extends = void 0 && (void 0).__extends || function () {
  var extendStatics = function (d, b) {
    extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
    };

    return extendStatics(d, b);
  };

  return function (d, b) {
    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();

var __assign = void 0 && (void 0).__assign || function () {
  __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];

      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }

    return t;
  };

  return __assign.apply(this, arguments);
};

var __awaiter = void 0 && (void 0).__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

var __generator = void 0 && (void 0).__generator || function (thisArg, body) {
  var _ = {
    label: 0,
    sent: function () {
      if (t[0] & 1) throw t[1];
      return t[1];
    },
    trys: [],
    ops: []
  },
      f,
      y,
      t,
      g;
  return g = {
    next: verb(0),
    "throw": verb(1),
    "return": verb(2)
  }, typeof Symbol === "function" && (g[Symbol.iterator] = function () {
    return this;
  }), g;

  function verb(n) {
    return function (v) {
      return step([n, v]);
    };
  }

  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");

    while (_) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];

      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;

        case 4:
          _.label++;
          return {
            value: op[1],
            done: false
          };

        case 5:
          _.label++;
          y = op[1];
          op = [0];
          continue;

        case 7:
          op = _.ops.pop();

          _.trys.pop();

          continue;

        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }

          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }

          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1];
            t = op;
            break;
          }

          if (t && _.label < t[2]) {
            _.label = t[2];

            _.ops.push(op);

            break;
          }

          if (t[2]) _.ops.pop();

          _.trys.pop();

          continue;
      }

      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e];
      y = 0;
    } finally {
      f = t = 0;
    }

    if (op[0] & 5) throw op[1];
    return {
      value: op[0] ? op[1] : void 0,
      done: true
    };
  }
};

var __read = void 0 && (void 0).__read || function (o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o),
      r,
      ar = [],
      e;

  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = {
      error: error
    };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }

  return ar;
};

/**
 * Common class for google translator implementations
 */
var AbstractGoogleTranslator =
/** @class */
function (_super) {
  __extends(AbstractGoogleTranslator, _super);

  function AbstractGoogleTranslator() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.langReplacements = {
      zh: 'zh-cn'
    };
    return _this;
  }

  AbstractGoogleTranslator.isSupportedAutoFrom = function () {
    return true;
  };

  AbstractGoogleTranslator.getSupportedLanguages = function () {
    // Supported, but not valid languages ["zh-cn", "zh-tw", 'ceb', 'haw', 'iw', 'hmn', 'jw', 'ma']
    // eslint-disable
    // prettier-ignore
    return ['af', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bs', 'bg', 'ca', 'ny', 'co', 'hr', 'cs', 'da', 'nl', 'en', 'eo', 'et', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka', 'de', 'el', 'gu', 'ht', 'ha', 'hi', 'hu', 'is', 'ig', 'id', 'ga', 'it', 'ja', 'kn', 'kk', 'km', 'ko', 'ku', 'ky', 'lo', 'la', 'lv', 'lt', 'lb', 'mk', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mn', 'my', 'ne', 'no', 'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru', 'sm', 'gd', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu', 'zh']; // eslint-enable
  };

  AbstractGoogleTranslator.prototype.getLengthLimit = function () {
    return 4000;
  };

  AbstractGoogleTranslator.prototype.getRequestsTimeout = function () {
    return 300;
  };

  AbstractGoogleTranslator.prototype.fixLang = function (lang) {
    return lang in this.langReplacements ? this.langReplacements[lang] : lang;
  };

  return AbstractGoogleTranslator;
}(_Translator.BaseTranslator);

exports.AbstractGoogleTranslator = AbstractGoogleTranslator;

/**
 * Translator implementation which use Google API with token from https://translate.google.com
 */
var GoogleTranslator =
/** @class */
function (_super) {
  __extends(GoogleTranslator, _super);

  function GoogleTranslator() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.parseXMLResponse = function (text) {
      var doc = new _xmldom.DOMParser().parseFromString(text);

      var nodes = _xpath.default.select('//pre/*[not(self::i)]//text()', doc);

      return nodes.map(function (node) {
        return node.toString();
      }).join(' ');
    };

    return _this;
  }

  GoogleTranslator.prototype.checkLimitExceeding = function (text) {
    if (Array.isArray(text)) {
      var encodedText = this.encodeForBatch(text).join('');
      var extra = encodedText.length - this.getLengthLimit();
      return extra > 0 ? extra : 0;
    } else {
      var extra = text.length - this.getLengthLimit();
      return extra > 0 ? extra : 0;
    }
  };

  GoogleTranslator.prototype.translate = function (text, from, to) {
    var _this = this;

    return (0, _token.getToken)(text).then(function (_a) {
      var tk = _a.value;
      var apiPath = 'https://translate.google.com/translate_a/single';
      var data = {
        client: 't',
        sl: _this.fixLang(from),
        tl: _this.fixLang(to),
        hl: _this.fixLang(to),
        dt: ['at', 'bd', 'ex', 'ld', 'md', 'qca', 'rw', 'rm', 'ss', 't'],
        ie: 'UTF-8',
        oe: 'UTF-8',
        otf: 1,
        ssel: 0,
        tsel: 0,
        kc: 7,
        q: text,
        tk: tk
      };
      var url = apiPath + '?' + (0, _queryString.stringify)(data);
      return _axios.default.get(_this.wrapUrlToCorsProxy(url), {
        withCredentials: false,
        headers: _this.options.headers
      }).then(function (rsp) {
        return rsp.data;
      }).then(function (rsp) {
        if (!(rsp instanceof Array) || !(rsp[0] instanceof Array)) {
          throw new Error('Unexpected response');
        }

        var translatedText = rsp[0].map(function (chunk) {
          return chunk instanceof Array && typeof chunk[0] === 'string' ? chunk[0] : '';
        }).join('');
        return translatedText;
      });
    });
  };

  GoogleTranslator.prototype.translateBatch = function (text, from, to) {
    var _this = this;

    var preparedText = this.encodeForBatch(text);
    return (0, _token.getToken)(preparedText.join('')).then(function (_a) {
      var tk = _a.value;
      var apiPath = 'https://translate.googleapis.com/translate_a/t';
      var data = {
        anno: 3,
        client: 'te',
        v: '1.0',
        format: 'html',
        sl: _this.fixLang(from),
        tl: _this.fixLang(to),
        tk: tk
      };
      var url = apiPath + '?' + (0, _queryString.stringify)(data);
      var body = preparedText.map(function (text) {
        return "&q=".concat(encodeURIComponent(text));
      }).join('');
      return (0, _axios.default)({
        url: _this.wrapUrlToCorsProxy(url),
        method: 'POST',
        withCredentials: false,
        headers: __assign({
          'Content-Type': 'application/x-www-form-urlencoded'
        }, _this.options.headers),
        data: body
      }).then(function (rsp) {
        return rsp.data;
      }).then(function (rawResp) {
        var resp = rawResp;

        if (text.length == 1) {
          // (string | string[])[]
          resp = [rawResp];
        }

        if (!Array.isArray(resp)) {
          throw new Error('Unexpected response');
        }

        var result = []; // Handle chunks

        resp.forEach(function (chunk) {
          var translatedText = '';

          if (from === 'auto') {
            // Structure: [translate: string, detectedLanguage: string]
            if (!Array.isArray(chunk) || typeof chunk[0] !== 'string') {
              throw new Error('Unexpected response');
            }

            translatedText = chunk[0];
          } else {
            // Structure: translate: string
            if (typeof chunk !== 'string') {
              throw new Error('Unexpected response');
            }

            translatedText = chunk;
          } // Try to parse XML


          var translationResult = null;

          try {
            translationResult = _this.parseXMLResponse(translatedText);
          } catch (error) {} // Push item


          if (translationResult === null || translationResult.length === 0) {
            // We don't have translation, so insert null instead of result
            result.push(null);
          } else {
            result.push(translationResult);
          }
        });

        if (result.length !== text.length) {
          throw new Error('Mismatching a lengths of original and translated arrays');
        }

        return result;
      });
    });
  };

  GoogleTranslator.prototype.encodeForBatch = function (textList) {
    return textList.map(function (text, i) {
      return "<pre><a i=\"".concat(i, "\">").concat(text, "</a></pre>");
    });
  };

  GoogleTranslator.translatorName = 'GoogleTranslator';
  return GoogleTranslator;
}(AbstractGoogleTranslator);

exports.GoogleTranslator = GoogleTranslator;

/**
 * Translator implementation which use Google API without token
 */
var GoogleTranslatorTokenFree =
/** @class */
function (_super) {
  __extends(GoogleTranslatorTokenFree, _super);

  function GoogleTranslatorTokenFree() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.translate = function (text, from, to) {
      return __awaiter(_this, void 0, void 0, function () {
        var _a, translation;

        return __generator(this, function (_b) {
          switch (_b.label) {
            case 0:
              return [4
              /*yield*/
              , this.translateBatch([text], from, to)];

            case 1:
              _a = __read.apply(void 0, [_b.sent(), 1]), translation = _a[0];
              return [2
              /*return*/
              , translation];
          }
        });
      });
    };

    return _this;
  }

  GoogleTranslatorTokenFree.prototype.translateBatch = function (text, from, to) {
    var apiPath = 'https://translate.googleapis.com/translate_a/t';
    var data = {
      client: 'dict-chrome-ex',
      sl: this.fixLang(from),
      tl: this.fixLang(to),
      q: text
    };
    var url = apiPath + '?' + (0, _queryString.stringify)(data);
    return (0, _axios.default)({
      url: this.wrapUrlToCorsProxy(url),
      method: 'GET',
      withCredentials: false,
      headers: __assign({
        'Content-Type': 'application/x-www-form-urlencoded'
      }, this.options.headers)
    }).then(function (rsp) {
      return rsp.data;
    }).then(function (rawResp) {
      if (text.length > 0 && Array.isArray(rawResp)) {
        // Handle many texts
        var innerArray = rawResp[0];

        if (!Array.isArray(innerArray) || innerArray.length !== text.length) {
          throw new TypeError('Invalid response');
        }

        return innerArray.map(function (item) {
          var obj = (0, _utils.deepExploreArray)(item, 3);

          if (typeof obj !== 'string') {
            throw new TypeError('Invalid item type');
          }

          return obj;
        });
      } else if (text.length === 1 && typeof rawResp === 'object' && rawResp !== null && 'sentences' in rawResp) {
        // Handle one text
        var sentences = rawResp.sentences;

        if (!Array.isArray(sentences)) {
          throw new TypeError('Invalid response');
        }

        var translatedText = sentences.slice(0, -1).map(function (sentence) {
          if (typeof sentence !== 'object' || !('trans' in sentence)) {
            throw new TypeError('Invalid response');
          }

          return sentence.trans;
        }).join('');
        return [translatedText];
      }

      throw new TypeError('Invalid response');
    });
  };

  GoogleTranslatorTokenFree.translatorName = 'GoogleTranslatorTokenFree';
  return GoogleTranslatorTokenFree;
}(AbstractGoogleTranslator);

exports.GoogleTranslatorTokenFree = GoogleTranslatorTokenFree;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRyYW5zbGF0b3JzL0dvb2dsZVRyYW5zbGF0b3IvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUNBOztBQUNBOztBQUVBOztBQUNBOztBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBOztBQUVHO0FBQ0gsSUFBQSx3QkFBQTtBQUFBO0FBQUEsVUFBQSxNQUFBLEVBQUE7QUFBdUQsRUFBQSxTQUFBLENBQUEsd0JBQUEsRUFBQSxNQUFBLENBQUE7O0FBQXZELFdBQUEsd0JBQUEsR0FBQTtBQUFBLFFBQUEsS0FBQSxHQUFBLE1BQUEsS0FBQSxJQUFBLElBQUEsTUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEVBQUEsU0FBQSxDQUFBLElBQUEsSUFBQTs7QUFpQ29CLElBQUEsS0FBQSxDQUFBLGdCQUFBLEdBQTJDO0FBQzdELE1BQUEsRUFBRSxFQUFFO0FBRHlELEtBQTNDOztBQU9uQjs7QUF2Q2MsRUFBQSx3QkFBQSxDQUFBLG1CQUFBLEdBQWQsWUFBQTtBQUNDLFdBQU8sSUFBUDtBQUNBLEdBRmE7O0FBSUEsRUFBQSx3QkFBQSxDQUFBLHFCQUFBLEdBQWQsWUFBQTtBQUNDO0FBRUE7QUFDQTtBQUNBLFdBQU8sQ0FDTixJQURNLEVBQ0EsSUFEQSxFQUNNLElBRE4sRUFDWSxJQURaLEVBQ2tCLElBRGxCLEVBQ3dCLElBRHhCLEVBQzhCLElBRDlCLEVBQ29DLElBRHBDLEVBQzBDLElBRDFDLEVBQ2dELElBRGhELEVBRU4sSUFGTSxFQUVBLElBRkEsRUFFTSxJQUZOLEVBRVksSUFGWixFQUVrQixJQUZsQixFQUV3QixJQUZ4QixFQUU4QixJQUY5QixFQUVvQyxJQUZwQyxFQUUwQyxJQUYxQyxFQUVnRCxJQUZoRCxFQUdOLElBSE0sRUFHQSxJQUhBLEVBR00sSUFITixFQUdZLElBSFosRUFHa0IsSUFIbEIsRUFHd0IsSUFIeEIsRUFHOEIsSUFIOUIsRUFHb0MsSUFIcEMsRUFHMEMsSUFIMUMsRUFHZ0QsSUFIaEQsRUFJTixJQUpNLEVBSUEsSUFKQSxFQUlNLElBSk4sRUFJWSxJQUpaLEVBSWtCLElBSmxCLEVBSXdCLElBSnhCLEVBSThCLElBSjlCLEVBSW9DLElBSnBDLEVBSTBDLElBSjFDLEVBSWdELElBSmhELEVBS04sSUFMTSxFQUtBLElBTEEsRUFLTSxJQUxOLEVBS1ksSUFMWixFQUtrQixJQUxsQixFQUt3QixJQUx4QixFQUs4QixJQUw5QixFQUtvQyxJQUxwQyxFQUswQyxJQUwxQyxFQUtnRCxJQUxoRCxFQU1OLElBTk0sRUFNQSxJQU5BLEVBTU0sSUFOTixFQU1ZLElBTlosRUFNa0IsSUFObEIsRUFNd0IsSUFOeEIsRUFNOEIsSUFOOUIsRUFNb0MsSUFOcEMsRUFNMEMsSUFOMUMsRUFNZ0QsSUFOaEQsRUFPTixJQVBNLEVBT0EsSUFQQSxFQU9NLElBUE4sRUFPWSxJQVBaLEVBT2tCLElBUGxCLEVBT3dCLElBUHhCLEVBTzhCLElBUDlCLEVBT29DLElBUHBDLEVBTzBDLElBUDFDLEVBT2dELElBUGhELEVBUU4sSUFSTSxFQVFBLElBUkEsRUFRTSxJQVJOLEVBUVksSUFSWixFQVFrQixJQVJsQixFQVF3QixJQVJ4QixFQVE4QixJQVI5QixFQVFvQyxJQVJwQyxFQVEwQyxJQVIxQyxFQVFnRCxJQVJoRCxFQVNOLElBVE0sRUFTQSxJQVRBLEVBU00sSUFUTixFQVNZLElBVFosRUFTa0IsSUFUbEIsRUFTd0IsSUFUeEIsRUFTOEIsSUFUOUIsRUFTb0MsSUFUcEMsRUFTMEMsSUFUMUMsRUFTZ0QsSUFUaEQsRUFVTixJQVZNLEVBVUEsSUFWQSxFQVVNLElBVk4sRUFVWSxJQVZaLEVBVWtCLElBVmxCLEVBVXdCLElBVnhCLEVBVThCLElBVjlCLEVBVW9DLElBVnBDLENBQVAsQ0FMRCxDQWlCQztBQUNBLEdBbEJhOztBQW9CUCxFQUFBLHdCQUFBLENBQUEsU0FBQSxDQUFBLGNBQUEsR0FBUCxZQUFBO0FBQ0MsV0FBTyxJQUFQO0FBQ0EsR0FGTTs7QUFJQSxFQUFBLHdCQUFBLENBQUEsU0FBQSxDQUFBLGtCQUFBLEdBQVAsWUFBQTtBQUNDLFdBQU8sR0FBUDtBQUNBLEdBRk07O0FBUUcsRUFBQSx3QkFBQSxDQUFBLFNBQUEsQ0FBQSxPQUFBLEdBQVYsVUFBa0IsSUFBbEIsRUFBd0M7QUFDdkMsV0FBTyxJQUFJLElBQUksS0FBSyxnQkFBYixHQUFnQyxLQUFLLGdCQUFMLENBQXNCLElBQXRCLENBQWhDLEdBQThELElBQXJFO0FBQ0EsR0FGUzs7QUFHWCxTQUFBLHdCQUFBO0FBQUMsQ0F4Q0QsQ0FBdUQsMEJBQXZELENBQUE7Ozs7QUEwQ0E7O0FBRUc7QUFDSCxJQUFBLGdCQUFBO0FBQUE7QUFBQSxVQUFBLE1BQUEsRUFBQTtBQUFzQyxFQUFBLFNBQUEsQ0FBQSxnQkFBQSxFQUFBLE1BQUEsQ0FBQTs7QUFBdEMsV0FBQSxnQkFBQSxHQUFBO0FBQUEsUUFBQSxLQUFBLEdBQUEsTUFBQSxLQUFBLElBQUEsSUFBQSxNQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsRUFBQSxTQUFBLENBQUEsSUFBQSxJQUFBOztBQTREUyxJQUFBLEtBQUEsQ0FBQSxnQkFBQSxHQUFtQixVQUFDLElBQUQsRUFBYTtBQUN2QyxVQUFNLEdBQUcsR0FBRyxJQUFJLGlCQUFKLEdBQWdCLGVBQWhCLENBQWdDLElBQWhDLENBQVo7O0FBQ0EsVUFBTSxLQUFLLEdBQUcsZUFBTSxNQUFOLENBQWEsK0JBQWIsRUFBOEMsR0FBOUMsQ0FBZDs7QUFDQSxhQUFPLEtBQUssQ0FBQyxHQUFOLENBQVUsVUFBQyxJQUFELEVBQUs7QUFBSyxlQUFBLElBQUksQ0FBSixRQUFBLEVBQUE7QUFBZSxPQUFuQyxFQUFxQyxJQUFyQyxDQUEwQyxHQUExQyxDQUFQO0FBQ0EsS0FKTzs7O0FBc0dSOztBQS9KTyxFQUFBLGdCQUFBLENBQUEsU0FBQSxDQUFBLG1CQUFBLEdBQVAsVUFBMkIsSUFBM0IsRUFBa0Q7QUFDakQsUUFBSSxLQUFLLENBQUMsT0FBTixDQUFjLElBQWQsQ0FBSixFQUF5QjtBQUN4QixVQUFNLFdBQVcsR0FBRyxLQUFLLGNBQUwsQ0FBb0IsSUFBcEIsRUFBMEIsSUFBMUIsQ0FBK0IsRUFBL0IsQ0FBcEI7QUFDQSxVQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsTUFBWixHQUFxQixLQUFLLGNBQUwsRUFBbkM7QUFDQSxhQUFPLEtBQUssR0FBRyxDQUFSLEdBQVksS0FBWixHQUFvQixDQUEzQjtBQUNBLEtBSkQsTUFJTztBQUNOLFVBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFMLEdBQWMsS0FBSyxjQUFMLEVBQTVCO0FBQ0EsYUFBTyxLQUFLLEdBQUcsQ0FBUixHQUFZLEtBQVosR0FBb0IsQ0FBM0I7QUFDQTtBQUNELEdBVE07O0FBV0EsRUFBQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxTQUFBLEdBQVAsVUFBaUIsSUFBakIsRUFBK0IsSUFBL0IsRUFBdUQsRUFBdkQsRUFBbUU7QUFBbkUsUUFBQSxLQUFBLEdBQUEsSUFBQTs7QUFDQyxXQUFPLHFCQUFTLElBQVQsRUFBZSxJQUFmLENBQW9CLFVBQUMsRUFBRCxFQUFjO1VBQUosRUFBRSxHQUFBLEVBQUEsQ0FBQSxLO0FBQ3RDLFVBQU0sT0FBTyxHQUFHLGlEQUFoQjtBQUVBLFVBQU0sSUFBSSxHQUFHO0FBQ1osUUFBQSxNQUFNLEVBQUUsR0FESTtBQUVaLFFBQUEsRUFBRSxFQUFFLEtBQUksQ0FBQyxPQUFMLENBQWEsSUFBYixDQUZRO0FBR1osUUFBQSxFQUFFLEVBQUUsS0FBSSxDQUFDLE9BQUwsQ0FBYSxFQUFiLENBSFE7QUFJWixRQUFBLEVBQUUsRUFBRSxLQUFJLENBQUMsT0FBTCxDQUFhLEVBQWIsQ0FKUTtBQUtaLFFBQUEsRUFBRSxFQUFFLENBQUMsSUFBRCxFQUFPLElBQVAsRUFBYSxJQUFiLEVBQW1CLElBQW5CLEVBQXlCLElBQXpCLEVBQStCLEtBQS9CLEVBQXNDLElBQXRDLEVBQTRDLElBQTVDLEVBQWtELElBQWxELEVBQXdELEdBQXhELENBTFE7QUFNWixRQUFBLEVBQUUsRUFBRSxPQU5RO0FBT1osUUFBQSxFQUFFLEVBQUUsT0FQUTtBQVFaLFFBQUEsR0FBRyxFQUFFLENBUk87QUFTWixRQUFBLElBQUksRUFBRSxDQVRNO0FBVVosUUFBQSxJQUFJLEVBQUUsQ0FWTTtBQVdaLFFBQUEsRUFBRSxFQUFFLENBWFE7QUFZWixRQUFBLENBQUMsRUFBRSxJQVpTO0FBYVosUUFBQSxFQUFFLEVBQUE7QUFiVSxPQUFiO0FBZ0JBLFVBQU0sR0FBRyxHQUFHLE9BQU8sR0FBRyxHQUFWLEdBQWdCLDRCQUFVLElBQVYsQ0FBNUI7QUFFQSxhQUFPLGVBQ0wsR0FESyxDQUNELEtBQUksQ0FBQyxrQkFBTCxDQUF3QixHQUF4QixDQURDLEVBQzZCO0FBQ2xDLFFBQUEsZUFBZSxFQUFFLEtBRGlCO0FBRWxDLFFBQUEsT0FBTyxFQUFFLEtBQUksQ0FBQyxPQUFMLENBQWE7QUFGWSxPQUQ3QixFQUtMLElBTEssQ0FLQSxVQUFDLEdBQUQsRUFBSTtBQUFLLGVBQUEsR0FBRyxDQUFILElBQUE7QUFBUSxPQUxqQixFQU1MLElBTkssQ0FNQSxVQUFDLEdBQUQsRUFBSTtBQUNULFlBQUksRUFBRSxHQUFHLFlBQVksS0FBakIsS0FBMkIsRUFBRSxHQUFHLENBQUMsQ0FBRCxDQUFILFlBQWtCLEtBQXBCLENBQS9CLEVBQTJEO0FBQzFELGdCQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDQTs7QUFFRCxZQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsQ0FBRCxDQUFILENBQ3JCLEdBRHFCLENBQ2pCLFVBQUMsS0FBRCxFQUFNO0FBQ1YsaUJBQUEsS0FBSyxZQUFZLEtBQWpCLElBQTBCLE9BQU8sS0FBSyxDQUFDLENBQUQsQ0FBWixLQUFvQixRQUE5QyxHQUNHLEtBQUssQ0FBQyxDQUFELENBRFIsR0FFRyxFQUZIO0FBRUssU0FKZ0IsRUFNckIsSUFOcUIsQ0FNaEIsRUFOZ0IsQ0FBdkI7QUFRQSxlQUFPLGNBQVA7QUFDQSxPQXBCSyxDQUFQO0FBcUJBLEtBMUNNLENBQVA7QUEyQ0EsR0E1Q007O0FBb0RBLEVBQUEsZ0JBQUEsQ0FBQSxTQUFBLENBQUEsY0FBQSxHQUFQLFVBQXNCLElBQXRCLEVBQXNDLElBQXRDLEVBQThELEVBQTlELEVBQTBFO0FBQTFFLFFBQUEsS0FBQSxHQUFBLElBQUE7O0FBQ0MsUUFBTSxZQUFZLEdBQUcsS0FBSyxjQUFMLENBQW9CLElBQXBCLENBQXJCO0FBQ0EsV0FBTyxxQkFBUyxZQUFZLENBQUMsSUFBYixDQUFrQixFQUFsQixDQUFULEVBQWdDLElBQWhDLENBQXFDLFVBQUMsRUFBRCxFQUFjO1VBQUosRUFBRSxHQUFBLEVBQUEsQ0FBQSxLO0FBQ3ZELFVBQU0sT0FBTyxHQUFHLGdEQUFoQjtBQUVBLFVBQU0sSUFBSSxHQUFHO0FBQ1osUUFBQSxJQUFJLEVBQUUsQ0FETTtBQUVaLFFBQUEsTUFBTSxFQUFFLElBRkk7QUFHWixRQUFBLENBQUMsRUFBRSxLQUhTO0FBSVosUUFBQSxNQUFNLEVBQUUsTUFKSTtBQUtaLFFBQUEsRUFBRSxFQUFFLEtBQUksQ0FBQyxPQUFMLENBQWEsSUFBYixDQUxRO0FBTVosUUFBQSxFQUFFLEVBQUUsS0FBSSxDQUFDLE9BQUwsQ0FBYSxFQUFiLENBTlE7QUFPWixRQUFBLEVBQUUsRUFBQTtBQVBVLE9BQWI7QUFVQSxVQUFNLEdBQUcsR0FBRyxPQUFPLEdBQUcsR0FBVixHQUFnQiw0QkFBVSxJQUFWLENBQTVCO0FBQ0EsVUFBTSxJQUFJLEdBQUcsWUFBWSxDQUN2QixHQURXLENBQ1AsVUFBQyxJQUFELEVBQUs7QUFBSyxlQUFBLE1BQUEsTUFBQSxDQUFNLGtCQUFrQixDQUF4QixJQUF3QixDQUF4QixDQUFBO0FBQWdDLE9BRG5DLEVBRVgsSUFGVyxDQUVOLEVBRk0sQ0FBYjtBQUlBLGFBQU8sb0JBQU07QUFDWixRQUFBLEdBQUcsRUFBRSxLQUFJLENBQUMsa0JBQUwsQ0FBd0IsR0FBeEIsQ0FETztBQUVaLFFBQUEsTUFBTSxFQUFFLE1BRkk7QUFHWixRQUFBLGVBQWUsRUFBRSxLQUhMO0FBSVosUUFBQSxPQUFPLEVBQUEsUUFBQSxDQUFBO0FBQ04sMEJBQWdCO0FBRFYsU0FBQSxFQUVILEtBQUksQ0FBQyxPQUFMLENBQWEsT0FGVixDQUpLO0FBUVosUUFBQSxJQUFJLEVBQUU7QUFSTSxPQUFOLEVBVUwsSUFWSyxDQVVBLFVBQUMsR0FBRCxFQUFJO0FBQUssZUFBQSxHQUFHLENBQUgsSUFBQTtBQUFRLE9BVmpCLEVBV0wsSUFYSyxDQVdBLFVBQUMsT0FBRCxFQUFRO0FBQ2IsWUFBSSxJQUFJLEdBQUcsT0FBWDs7QUFDQSxZQUFJLElBQUksQ0FBQyxNQUFMLElBQWUsQ0FBbkIsRUFBc0I7QUFDckI7QUFDQSxVQUFBLElBQUksR0FBRyxDQUFDLE9BQUQsQ0FBUDtBQUNBOztBQUVELFlBQUksQ0FBQyxLQUFLLENBQUMsT0FBTixDQUFjLElBQWQsQ0FBTCxFQUEwQjtBQUN6QixnQkFBTSxJQUFJLEtBQUosQ0FBVSxxQkFBVixDQUFOO0FBQ0E7O0FBRUQsWUFBTSxNQUFNLEdBQXNCLEVBQWxDLENBWGEsQ0FhYjs7QUFDQSxRQUFBLElBQUksQ0FBQyxPQUFMLENBQWEsVUFBQyxLQUFELEVBQU07QUFDbEIsY0FBSSxjQUFjLEdBQUcsRUFBckI7O0FBRUEsY0FBSSxJQUFJLEtBQUssTUFBYixFQUFxQjtBQUNwQjtBQUNBLGdCQUFJLENBQUMsS0FBSyxDQUFDLE9BQU4sQ0FBYyxLQUFkLENBQUQsSUFBeUIsT0FBTyxLQUFLLENBQUMsQ0FBRCxDQUFaLEtBQW9CLFFBQWpELEVBQTJEO0FBQzFELG9CQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDQTs7QUFFRCxZQUFBLGNBQWMsR0FBRyxLQUFLLENBQUMsQ0FBRCxDQUF0QjtBQUNBLFdBUEQsTUFPTztBQUNOO0FBQ0EsZ0JBQUksT0FBTyxLQUFQLEtBQWlCLFFBQXJCLEVBQStCO0FBQzlCLG9CQUFNLElBQUksS0FBSixDQUFVLHFCQUFWLENBQU47QUFDQTs7QUFFRCxZQUFBLGNBQWMsR0FBRyxLQUFqQjtBQUNBLFdBakJpQixDQW1CbEI7OztBQUNBLGNBQUksaUJBQWlCLEdBQWtCLElBQXZDOztBQUNBLGNBQUk7QUFDSCxZQUFBLGlCQUFpQixHQUFHLEtBQUksQ0FBQyxnQkFBTCxDQUFzQixjQUF0QixDQUFwQjtBQUNBLFdBRkQsQ0FFRSxPQUFPLEtBQVAsRUFBYyxDQUFFLENBdkJBLENBeUJsQjs7O0FBQ0EsY0FDQyxpQkFBaUIsS0FBSyxJQUF0QixJQUNBLGlCQUFpQixDQUFDLE1BQWxCLEtBQTZCLENBRjlCLEVBR0U7QUFDRDtBQUNBLFlBQUEsTUFBTSxDQUFDLElBQVAsQ0FBWSxJQUFaO0FBQ0EsV0FORCxNQU1PO0FBQ04sWUFBQSxNQUFNLENBQUMsSUFBUCxDQUFZLGlCQUFaO0FBQ0E7QUFDRCxTQW5DRDs7QUFxQ0EsWUFBSSxNQUFNLENBQUMsTUFBUCxLQUFrQixJQUFJLENBQUMsTUFBM0IsRUFBbUM7QUFDbEMsZ0JBQU0sSUFBSSxLQUFKLENBQ0wseURBREssQ0FBTjtBQUdBOztBQUVELGVBQU8sTUFBUDtBQUNBLE9BckVLLENBQVA7QUFzRUEsS0F4Rk0sQ0FBUDtBQXlGQSxHQTNGTTs7QUE2RkMsRUFBQSxnQkFBQSxDQUFBLFNBQUEsQ0FBQSxjQUFBLEdBQVIsVUFBdUIsUUFBdkIsRUFBeUM7QUFDeEMsV0FBTyxRQUFRLENBQUMsR0FBVCxDQUFhLFVBQUMsSUFBRCxFQUFPLENBQVAsRUFBUTtBQUFLLGFBQUEsZUFBQSxNQUFBLENBQWMsQ0FBZCxFQUFlLEtBQWYsRUFBZSxNQUFmLENBQW9CLElBQXBCLEVBQUEsWUFBQSxDQUFBO0FBQW9DLEtBQTlELENBQVA7QUFDQSxHQUZPOztBQTlKZSxFQUFBLGdCQUFBLENBQUEsY0FBQSxHQUFpQixrQkFBakI7QUFpS3hCLFNBQUEsZ0JBQUE7QUFBQyxDQWxLRCxDQUFzQyx3QkFBdEMsQ0FBQTs7OztBQW9LQTs7QUFFRztBQUNILElBQUEseUJBQUE7QUFBQTtBQUFBLFVBQUEsTUFBQSxFQUFBO0FBQStDLEVBQUEsU0FBQSxDQUFBLHlCQUFBLEVBQUEsTUFBQSxDQUFBOztBQUEvQyxXQUFBLHlCQUFBLEdBQUE7QUFBQSxRQUFBLEtBQUEsR0FBQSxNQUFBLEtBQUEsSUFBQSxJQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxFQUFBLFNBQUEsQ0FBQSxJQUFBLElBQUE7O0FBR1EsSUFBQSxLQUFBLENBQUEsU0FBQSxHQUFZLFVBQU8sSUFBUCxFQUFxQixJQUFyQixFQUE2QyxFQUE3QyxFQUF5RDtBQUFBLGFBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxZQUFBOzs7Ozs7QUFDckQscUJBQUEsQ0FBQTtBQUFBO0FBQUEsZ0JBQU0sS0FBSyxjQUFMLENBQW9CLENBQUMsSUFBRCxDQUFwQixFQUE0QixJQUE1QixFQUFrQyxFQUFsQyxDQUFOLENBQUE7OztBQUFoQixjQUFBLEVBQUEsR0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxFQUFBLENBQWdCLEVBQUEsQ0FBQSxJQUFBLEVBQWhCLEVBQTJELENBQTNELENBQUEsQ0FBQSxFQUFDLFdBQVcsR0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFaO0FBQ04scUJBQUEsQ0FBQTtBQUFBO0FBQUEsZ0JBQU8sV0FBUCxDQUFBOzs7T0FGMkUsQ0FBQTtBQUczRSxLQUhNOzs7QUF3RVA7O0FBbkVPLEVBQUEseUJBQUEsQ0FBQSxTQUFBLENBQUEsY0FBQSxHQUFQLFVBQXNCLElBQXRCLEVBQXNDLElBQXRDLEVBQThELEVBQTlELEVBQTBFO0FBQ3pFLFFBQU0sT0FBTyxHQUFHLGdEQUFoQjtBQUVBLFFBQU0sSUFBSSxHQUFHO0FBQ1osTUFBQSxNQUFNLEVBQUUsZ0JBREk7QUFFWixNQUFBLEVBQUUsRUFBRSxLQUFLLE9BQUwsQ0FBYSxJQUFiLENBRlE7QUFHWixNQUFBLEVBQUUsRUFBRSxLQUFLLE9BQUwsQ0FBYSxFQUFiLENBSFE7QUFJWixNQUFBLENBQUMsRUFBRTtBQUpTLEtBQWI7QUFPQSxRQUFNLEdBQUcsR0FBRyxPQUFPLEdBQUcsR0FBVixHQUFnQiw0QkFBVSxJQUFWLENBQTVCO0FBRUEsV0FBTyxvQkFBTTtBQUNaLE1BQUEsR0FBRyxFQUFFLEtBQUssa0JBQUwsQ0FBd0IsR0FBeEIsQ0FETztBQUVaLE1BQUEsTUFBTSxFQUFFLEtBRkk7QUFHWixNQUFBLGVBQWUsRUFBRSxLQUhMO0FBSVosTUFBQSxPQUFPLEVBQUEsUUFBQSxDQUFBO0FBQ04sd0JBQWdCO0FBRFYsT0FBQSxFQUVILEtBQUssT0FBTCxDQUFhLE9BRlY7QUFKSyxLQUFOLEVBU0wsSUFUSyxDQVNBLFVBQUMsR0FBRCxFQUFJO0FBQUssYUFBQSxHQUFHLENBQUgsSUFBQTtBQUFRLEtBVGpCLEVBVUwsSUFWSyxDQVVBLFVBQUMsT0FBRCxFQUFRO0FBQ2IsVUFBSSxJQUFJLENBQUMsTUFBTCxHQUFjLENBQWQsSUFBbUIsS0FBSyxDQUFDLE9BQU4sQ0FBYyxPQUFkLENBQXZCLEVBQStDO0FBQzlDO0FBQ0EsWUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLENBQUQsQ0FBMUI7O0FBQ0EsWUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFOLENBQWMsVUFBZCxDQUFELElBQThCLFVBQVUsQ0FBQyxNQUFYLEtBQXNCLElBQUksQ0FBQyxNQUE3RCxFQUFxRTtBQUNwRSxnQkFBTSxJQUFJLFNBQUosQ0FBYyxrQkFBZCxDQUFOO0FBQ0E7O0FBRUQsZUFBTyxVQUFVLENBQUMsR0FBWCxDQUFlLFVBQUMsSUFBRCxFQUFLO0FBQzFCLGNBQU0sR0FBRyxHQUFHLDZCQUFpQixJQUFqQixFQUF1QixDQUF2QixDQUFaOztBQUNBLGNBQUksT0FBTyxHQUFQLEtBQWUsUUFBbkIsRUFBNkI7QUFDNUIsa0JBQU0sSUFBSSxTQUFKLENBQWMsbUJBQWQsQ0FBTjtBQUNBOztBQUVELGlCQUFPLEdBQVA7QUFDQSxTQVBNLENBQVA7QUFRQSxPQWZELE1BZU8sSUFDTixJQUFJLENBQUMsTUFBTCxLQUFnQixDQUFoQixJQUNBLE9BQU8sT0FBUCxLQUFtQixRQURuQixJQUVBLE9BQU8sS0FBSyxJQUZaLElBR0EsZUFBZSxPQUpULEVBS0w7QUFDRDtBQUNBLFlBQU0sU0FBUyxHQUFJLE9BQWUsQ0FBQyxTQUFuQzs7QUFDQSxZQUFJLENBQUMsS0FBSyxDQUFDLE9BQU4sQ0FBYyxTQUFkLENBQUwsRUFBK0I7QUFDOUIsZ0JBQU0sSUFBSSxTQUFKLENBQWMsa0JBQWQsQ0FBTjtBQUNBOztBQUVELFlBQU0sY0FBYyxHQUFHLFNBQVMsQ0FDOUIsS0FEcUIsQ0FDZixDQURlLEVBQ1osQ0FBQyxDQURXLEVBRXJCLEdBRnFCLENBRWpCLFVBQUMsUUFBRCxFQUFTO0FBQ2IsY0FBSSxPQUFPLFFBQVAsS0FBb0IsUUFBcEIsSUFBZ0MsRUFBRSxXQUFXLFFBQWIsQ0FBcEMsRUFBNEQ7QUFDM0Qsa0JBQU0sSUFBSSxTQUFKLENBQWMsa0JBQWQsQ0FBTjtBQUNBOztBQUVELGlCQUFPLFFBQVEsQ0FBQyxLQUFoQjtBQUNBLFNBUnFCLEVBU3JCLElBVHFCLENBU2hCLEVBVGdCLENBQXZCO0FBV0EsZUFBTyxDQUFDLGNBQUQsQ0FBUDtBQUNBOztBQUVELFlBQU0sSUFBSSxTQUFKLENBQWMsa0JBQWQsQ0FBTjtBQUNBLEtBckRLLENBQVA7QUFzREEsR0FsRU07O0FBUGdCLEVBQUEseUJBQUEsQ0FBQSxjQUFBLEdBQWlCLDJCQUFqQjtBQTBFeEIsU0FBQSx5QkFBQTtBQUFDLENBM0VELENBQStDLHdCQUEvQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGF4aW9zIGZyb20gJ2F4aW9zJztcbmltcG9ydCB7IHN0cmluZ2lmeSB9IGZyb20gJ3F1ZXJ5LXN0cmluZyc7XG5pbXBvcnQgeHBhdGggZnJvbSAneHBhdGgnO1xuaW1wb3J0IHsgRE9NUGFyc2VyIH0gZnJvbSAneG1sZG9tJztcblxuaW1wb3J0IHsgbGFuZ0NvZGUsIGxhbmdDb2RlV2l0aEF1dG8sIEJhc2VUcmFuc2xhdG9yIH0gZnJvbSAnLi4vLi4vdHlwZXMvVHJhbnNsYXRvcic7XG5pbXBvcnQgeyBnZXRUb2tlbiB9IGZyb20gJy4vdG9rZW4nO1xuaW1wb3J0IHsgZGVlcEV4cGxvcmVBcnJheSB9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIENvbW1vbiBjbGFzcyBmb3IgZ29vZ2xlIHRyYW5zbGF0b3IgaW1wbGVtZW50YXRpb25zXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBYnN0cmFjdEdvb2dsZVRyYW5zbGF0b3IgZXh0ZW5kcyBCYXNlVHJhbnNsYXRvciB7XG5cdHB1YmxpYyBzdGF0aWMgaXNTdXBwb3J0ZWRBdXRvRnJvbSgpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHB1YmxpYyBzdGF0aWMgZ2V0U3VwcG9ydGVkTGFuZ3VhZ2VzKCk6IGxhbmdDb2RlW10ge1xuXHRcdC8vIFN1cHBvcnRlZCwgYnV0IG5vdCB2YWxpZCBsYW5ndWFnZXMgW1wiemgtY25cIiwgXCJ6aC10d1wiLCAnY2ViJywgJ2hhdycsICdpdycsICdobW4nLCAnancnLCAnbWEnXVxuXG5cdFx0Ly8gZXNsaW50LWRpc2FibGVcblx0XHQvLyBwcmV0dGllci1pZ25vcmVcblx0XHRyZXR1cm4gW1xuXHRcdFx0J2FmJywgJ3NxJywgJ2FtJywgJ2FyJywgJ2h5JywgJ2F6JywgJ2V1JywgJ2JlJywgJ2JuJywgJ2JzJyxcblx0XHRcdCdiZycsICdjYScsICdueScsICdjbycsICdocicsICdjcycsICdkYScsICdubCcsICdlbicsICdlbycsXG5cdFx0XHQnZXQnLCAndGwnLCAnZmknLCAnZnInLCAnZnknLCAnZ2wnLCAna2EnLCAnZGUnLCAnZWwnLCAnZ3UnLFxuXHRcdFx0J2h0JywgJ2hhJywgJ2hpJywgJ2h1JywgJ2lzJywgJ2lnJywgJ2lkJywgJ2dhJywgJ2l0JywgJ2phJyxcblx0XHRcdCdrbicsICdraycsICdrbScsICdrbycsICdrdScsICdreScsICdsbycsICdsYScsICdsdicsICdsdCcsXG5cdFx0XHQnbGInLCAnbWsnLCAnbWcnLCAnbXMnLCAnbWwnLCAnbXQnLCAnbWknLCAnbXInLCAnbW4nLCAnbXknLFxuXHRcdFx0J25lJywgJ25vJywgJ3BzJywgJ2ZhJywgJ3BsJywgJ3B0JywgJ3BhJywgJ3JvJywgJ3J1JywgJ3NtJyxcblx0XHRcdCdnZCcsICdzcicsICdzdCcsICdzbicsICdzZCcsICdzaScsICdzaycsICdzbCcsICdzbycsICdlcycsXG5cdFx0XHQnc3UnLCAnc3cnLCAnc3YnLCAndGcnLCAndGEnLCAndGUnLCAndGgnLCAndHInLCAndWsnLCAndXInLFxuXHRcdFx0J3V6JywgJ3ZpJywgJ2N5JywgJ3hoJywgJ3lpJywgJ3lvJywgJ3p1JywgJ3poJyxcblx0XHRdO1xuXHRcdC8vIGVzbGludC1lbmFibGVcblx0fVxuXG5cdHB1YmxpYyBnZXRMZW5ndGhMaW1pdCgpIHtcblx0XHRyZXR1cm4gNDAwMDtcblx0fVxuXG5cdHB1YmxpYyBnZXRSZXF1ZXN0c1RpbWVvdXQoKSB7XG5cdFx0cmV0dXJuIDMwMDtcblx0fVxuXG5cdHByb3RlY3RlZCByZWFkb25seSBsYW5nUmVwbGFjZW1lbnRzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuXHRcdHpoOiAnemgtY24nLFxuXHR9O1xuXG5cdHByb3RlY3RlZCBmaXhMYW5nKGxhbmc6IGxhbmdDb2RlV2l0aEF1dG8pIHtcblx0XHRyZXR1cm4gbGFuZyBpbiB0aGlzLmxhbmdSZXBsYWNlbWVudHMgPyB0aGlzLmxhbmdSZXBsYWNlbWVudHNbbGFuZ10gOiBsYW5nO1xuXHR9XG59XG5cbi8qKlxuICogVHJhbnNsYXRvciBpbXBsZW1lbnRhdGlvbiB3aGljaCB1c2UgR29vZ2xlIEFQSSB3aXRoIHRva2VuIGZyb20gaHR0cHM6Ly90cmFuc2xhdGUuZ29vZ2xlLmNvbVxuICovXG5leHBvcnQgY2xhc3MgR29vZ2xlVHJhbnNsYXRvciBleHRlbmRzIEFic3RyYWN0R29vZ2xlVHJhbnNsYXRvciB7XG5cdHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgdHJhbnNsYXRvck5hbWUgPSAnR29vZ2xlVHJhbnNsYXRvcic7XG5cblx0cHVibGljIGNoZWNrTGltaXRFeGNlZWRpbmcodGV4dDogc3RyaW5nIHwgc3RyaW5nW10pIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheSh0ZXh0KSkge1xuXHRcdFx0Y29uc3QgZW5jb2RlZFRleHQgPSB0aGlzLmVuY29kZUZvckJhdGNoKHRleHQpLmpvaW4oJycpO1xuXHRcdFx0Y29uc3QgZXh0cmEgPSBlbmNvZGVkVGV4dC5sZW5ndGggLSB0aGlzLmdldExlbmd0aExpbWl0KCk7XG5cdFx0XHRyZXR1cm4gZXh0cmEgPiAwID8gZXh0cmEgOiAwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zdCBleHRyYSA9IHRleHQubGVuZ3RoIC0gdGhpcy5nZXRMZW5ndGhMaW1pdCgpO1xuXHRcdFx0cmV0dXJuIGV4dHJhID4gMCA/IGV4dHJhIDogMDtcblx0XHR9XG5cdH1cblxuXHRwdWJsaWMgdHJhbnNsYXRlKHRleHQ6IHN0cmluZywgZnJvbTogbGFuZ0NvZGVXaXRoQXV0bywgdG86IGxhbmdDb2RlKSB7XG5cdFx0cmV0dXJuIGdldFRva2VuKHRleHQpLnRoZW4oKHsgdmFsdWU6IHRrIH0pID0+IHtcblx0XHRcdGNvbnN0IGFwaVBhdGggPSAnaHR0cHM6Ly90cmFuc2xhdGUuZ29vZ2xlLmNvbS90cmFuc2xhdGVfYS9zaW5nbGUnO1xuXG5cdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHRjbGllbnQ6ICd0Jyxcblx0XHRcdFx0c2w6IHRoaXMuZml4TGFuZyhmcm9tKSxcblx0XHRcdFx0dGw6IHRoaXMuZml4TGFuZyh0byksXG5cdFx0XHRcdGhsOiB0aGlzLmZpeExhbmcodG8pLFxuXHRcdFx0XHRkdDogWydhdCcsICdiZCcsICdleCcsICdsZCcsICdtZCcsICdxY2EnLCAncncnLCAncm0nLCAnc3MnLCAndCddLFxuXHRcdFx0XHRpZTogJ1VURi04Jyxcblx0XHRcdFx0b2U6ICdVVEYtOCcsXG5cdFx0XHRcdG90ZjogMSxcblx0XHRcdFx0c3NlbDogMCxcblx0XHRcdFx0dHNlbDogMCxcblx0XHRcdFx0a2M6IDcsXG5cdFx0XHRcdHE6IHRleHQsXG5cdFx0XHRcdHRrLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgdXJsID0gYXBpUGF0aCArICc/JyArIHN0cmluZ2lmeShkYXRhKTtcblxuXHRcdFx0cmV0dXJuIGF4aW9zXG5cdFx0XHRcdC5nZXQodGhpcy53cmFwVXJsVG9Db3JzUHJveHkodXJsKSwge1xuXHRcdFx0XHRcdHdpdGhDcmVkZW50aWFsczogZmFsc2UsXG5cdFx0XHRcdFx0aGVhZGVyczogdGhpcy5vcHRpb25zLmhlYWRlcnMsXG5cdFx0XHRcdH0pXG5cdFx0XHRcdC50aGVuKChyc3ApID0+IHJzcC5kYXRhKVxuXHRcdFx0XHQudGhlbigocnNwKSA9PiB7XG5cdFx0XHRcdFx0aWYgKCEocnNwIGluc3RhbmNlb2YgQXJyYXkpIHx8ICEocnNwWzBdIGluc3RhbmNlb2YgQXJyYXkpKSB7XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgcmVzcG9uc2UnKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdCB0cmFuc2xhdGVkVGV4dCA9IHJzcFswXVxuXHRcdFx0XHRcdFx0Lm1hcCgoY2h1bmspID0+XG5cdFx0XHRcdFx0XHRcdGNodW5rIGluc3RhbmNlb2YgQXJyYXkgJiYgdHlwZW9mIGNodW5rWzBdID09PSAnc3RyaW5nJ1xuXHRcdFx0XHRcdFx0XHRcdD8gY2h1bmtbMF1cblx0XHRcdFx0XHRcdFx0XHQ6ICcnLFxuXHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0LmpvaW4oJycpO1xuXG5cdFx0XHRcdFx0cmV0dXJuIHRyYW5zbGF0ZWRUZXh0O1xuXHRcdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgcGFyc2VYTUxSZXNwb25zZSA9ICh0ZXh0OiBzdHJpbmcpID0+IHtcblx0XHRjb25zdCBkb2MgPSBuZXcgRE9NUGFyc2VyKCkucGFyc2VGcm9tU3RyaW5nKHRleHQpO1xuXHRcdGNvbnN0IG5vZGVzID0geHBhdGguc2VsZWN0KCcvL3ByZS8qW25vdChzZWxmOjppKV0vL3RleHQoKScsIGRvYyk7XG5cdFx0cmV0dXJuIG5vZGVzLm1hcCgobm9kZSkgPT4gbm9kZS50b1N0cmluZygpKS5qb2luKCcgJyk7XG5cdH07XG5cblx0cHVibGljIHRyYW5zbGF0ZUJhdGNoKHRleHQ6IHN0cmluZ1tdLCBmcm9tOiBsYW5nQ29kZVdpdGhBdXRvLCB0bzogbGFuZ0NvZGUpIHtcblx0XHRjb25zdCBwcmVwYXJlZFRleHQgPSB0aGlzLmVuY29kZUZvckJhdGNoKHRleHQpO1xuXHRcdHJldHVybiBnZXRUb2tlbihwcmVwYXJlZFRleHQuam9pbignJykpLnRoZW4oKHsgdmFsdWU6IHRrIH0pID0+IHtcblx0XHRcdGNvbnN0IGFwaVBhdGggPSAnaHR0cHM6Ly90cmFuc2xhdGUuZ29vZ2xlYXBpcy5jb20vdHJhbnNsYXRlX2EvdCc7XG5cblx0XHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRcdGFubm86IDMsXG5cdFx0XHRcdGNsaWVudDogJ3RlJyxcblx0XHRcdFx0djogJzEuMCcsXG5cdFx0XHRcdGZvcm1hdDogJ2h0bWwnLFxuXHRcdFx0XHRzbDogdGhpcy5maXhMYW5nKGZyb20pLFxuXHRcdFx0XHR0bDogdGhpcy5maXhMYW5nKHRvKSxcblx0XHRcdFx0dGssXG5cdFx0XHR9O1xuXG5cdFx0XHRjb25zdCB1cmwgPSBhcGlQYXRoICsgJz8nICsgc3RyaW5naWZ5KGRhdGEpO1xuXHRcdFx0Y29uc3QgYm9keSA9IHByZXBhcmVkVGV4dFxuXHRcdFx0XHQubWFwKCh0ZXh0KSA9PiBgJnE9JHtlbmNvZGVVUklDb21wb25lbnQodGV4dCl9YClcblx0XHRcdFx0LmpvaW4oJycpO1xuXG5cdFx0XHRyZXR1cm4gYXhpb3Moe1xuXHRcdFx0XHR1cmw6IHRoaXMud3JhcFVybFRvQ29yc1Byb3h5KHVybCksXG5cdFx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0XHR3aXRoQ3JlZGVudGlhbHM6IGZhbHNlLFxuXHRcdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdFx0J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLFxuXHRcdFx0XHRcdC4uLnRoaXMub3B0aW9ucy5oZWFkZXJzLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRkYXRhOiBib2R5LFxuXHRcdFx0fSlcblx0XHRcdFx0LnRoZW4oKHJzcCkgPT4gcnNwLmRhdGEpXG5cdFx0XHRcdC50aGVuKChyYXdSZXNwKSA9PiB7XG5cdFx0XHRcdFx0bGV0IHJlc3AgPSByYXdSZXNwO1xuXHRcdFx0XHRcdGlmICh0ZXh0Lmxlbmd0aCA9PSAxKSB7XG5cdFx0XHRcdFx0XHQvLyAoc3RyaW5nIHwgc3RyaW5nW10pW11cblx0XHRcdFx0XHRcdHJlc3AgPSBbcmF3UmVzcF07XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KHJlc3ApKSB7XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgcmVzcG9uc2UnKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdCByZXN1bHQ6IChzdHJpbmcgfCBudWxsKVtdID0gW107XG5cblx0XHRcdFx0XHQvLyBIYW5kbGUgY2h1bmtzXG5cdFx0XHRcdFx0cmVzcC5mb3JFYWNoKChjaHVuaykgPT4ge1xuXHRcdFx0XHRcdFx0bGV0IHRyYW5zbGF0ZWRUZXh0ID0gJyc7XG5cblx0XHRcdFx0XHRcdGlmIChmcm9tID09PSAnYXV0bycpIHtcblx0XHRcdFx0XHRcdFx0Ly8gU3RydWN0dXJlOiBbdHJhbnNsYXRlOiBzdHJpbmcsIGRldGVjdGVkTGFuZ3VhZ2U6IHN0cmluZ11cblx0XHRcdFx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KGNodW5rKSB8fCB0eXBlb2YgY2h1bmtbMF0gIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIHJlc3BvbnNlJyk7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHR0cmFuc2xhdGVkVGV4dCA9IGNodW5rWzBdO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0Ly8gU3RydWN0dXJlOiB0cmFuc2xhdGU6IHN0cmluZ1xuXHRcdFx0XHRcdFx0XHRpZiAodHlwZW9mIGNodW5rICE9PSAnc3RyaW5nJykge1xuXHRcdFx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignVW5leHBlY3RlZCByZXNwb25zZScpO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0dHJhbnNsYXRlZFRleHQgPSBjaHVuaztcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly8gVHJ5IHRvIHBhcnNlIFhNTFxuXHRcdFx0XHRcdFx0bGV0IHRyYW5zbGF0aW9uUmVzdWx0OiBudWxsIHwgc3RyaW5nID0gbnVsbDtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdHRyYW5zbGF0aW9uUmVzdWx0ID0gdGhpcy5wYXJzZVhNTFJlc3BvbnNlKHRyYW5zbGF0ZWRUZXh0KTtcblx0XHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7fVxuXG5cdFx0XHRcdFx0XHQvLyBQdXNoIGl0ZW1cblx0XHRcdFx0XHRcdGlmIChcblx0XHRcdFx0XHRcdFx0dHJhbnNsYXRpb25SZXN1bHQgPT09IG51bGwgfHxcblx0XHRcdFx0XHRcdFx0dHJhbnNsYXRpb25SZXN1bHQubGVuZ3RoID09PSAwXG5cdFx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdFx0Ly8gV2UgZG9uJ3QgaGF2ZSB0cmFuc2xhdGlvbiwgc28gaW5zZXJ0IG51bGwgaW5zdGVhZCBvZiByZXN1bHRcblx0XHRcdFx0XHRcdFx0cmVzdWx0LnB1c2gobnVsbCk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRyZXN1bHQucHVzaCh0cmFuc2xhdGlvblJlc3VsdCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRpZiAocmVzdWx0Lmxlbmd0aCAhPT0gdGV4dC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdFx0XHRcdFx0J01pc21hdGNoaW5nIGEgbGVuZ3RocyBvZiBvcmlnaW5hbCBhbmQgdHJhbnNsYXRlZCBhcnJheXMnLFxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgZW5jb2RlRm9yQmF0Y2godGV4dExpc3Q6IHN0cmluZ1tdKSB7XG5cdFx0cmV0dXJuIHRleHRMaXN0Lm1hcCgodGV4dCwgaSkgPT4gYDxwcmU+PGEgaT1cIiR7aX1cIj4ke3RleHR9PC9hPjwvcHJlPmApO1xuXHR9XG59XG5cbi8qKlxuICogVHJhbnNsYXRvciBpbXBsZW1lbnRhdGlvbiB3aGljaCB1c2UgR29vZ2xlIEFQSSB3aXRob3V0IHRva2VuXG4gKi9cbmV4cG9ydCBjbGFzcyBHb29nbGVUcmFuc2xhdG9yVG9rZW5GcmVlIGV4dGVuZHMgQWJzdHJhY3RHb29nbGVUcmFuc2xhdG9yIHtcblx0cHVibGljIHN0YXRpYyByZWFkb25seSB0cmFuc2xhdG9yTmFtZSA9ICdHb29nbGVUcmFuc2xhdG9yVG9rZW5GcmVlJztcblxuXHRwdWJsaWMgdHJhbnNsYXRlID0gYXN5bmMgKHRleHQ6IHN0cmluZywgZnJvbTogbGFuZ0NvZGVXaXRoQXV0bywgdG86IGxhbmdDb2RlKSA9PiB7XG5cdFx0Y29uc3QgW3RyYW5zbGF0aW9uXSA9IGF3YWl0IHRoaXMudHJhbnNsYXRlQmF0Y2goW3RleHRdLCBmcm9tLCB0byk7XG5cdFx0cmV0dXJuIHRyYW5zbGF0aW9uO1xuXHR9O1xuXG5cdHB1YmxpYyB0cmFuc2xhdGVCYXRjaCh0ZXh0OiBzdHJpbmdbXSwgZnJvbTogbGFuZ0NvZGVXaXRoQXV0bywgdG86IGxhbmdDb2RlKSB7XG5cdFx0Y29uc3QgYXBpUGF0aCA9ICdodHRwczovL3RyYW5zbGF0ZS5nb29nbGVhcGlzLmNvbS90cmFuc2xhdGVfYS90JztcblxuXHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRjbGllbnQ6ICdkaWN0LWNocm9tZS1leCcsXG5cdFx0XHRzbDogdGhpcy5maXhMYW5nKGZyb20pLFxuXHRcdFx0dGw6IHRoaXMuZml4TGFuZyh0byksXG5cdFx0XHRxOiB0ZXh0LFxuXHRcdH07XG5cblx0XHRjb25zdCB1cmwgPSBhcGlQYXRoICsgJz8nICsgc3RyaW5naWZ5KGRhdGEpO1xuXG5cdFx0cmV0dXJuIGF4aW9zKHtcblx0XHRcdHVybDogdGhpcy53cmFwVXJsVG9Db3JzUHJveHkodXJsKSxcblx0XHRcdG1ldGhvZDogJ0dFVCcsXG5cdFx0XHR3aXRoQ3JlZGVudGlhbHM6IGZhbHNlLFxuXHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHQnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG5cdFx0XHRcdC4uLnRoaXMub3B0aW9ucy5oZWFkZXJzLFxuXHRcdFx0fSxcblx0XHR9KVxuXHRcdFx0LnRoZW4oKHJzcCkgPT4gcnNwLmRhdGEpXG5cdFx0XHQudGhlbigocmF3UmVzcCkgPT4ge1xuXHRcdFx0XHRpZiAodGV4dC5sZW5ndGggPiAwICYmIEFycmF5LmlzQXJyYXkocmF3UmVzcCkpIHtcblx0XHRcdFx0XHQvLyBIYW5kbGUgbWFueSB0ZXh0c1xuXHRcdFx0XHRcdGNvbnN0IGlubmVyQXJyYXkgPSByYXdSZXNwWzBdO1xuXHRcdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShpbm5lckFycmF5KSB8fCBpbm5lckFycmF5Lmxlbmd0aCAhPT0gdGV4dC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgcmVzcG9uc2UnKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4gaW5uZXJBcnJheS5tYXAoKGl0ZW0pID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IG9iaiA9IGRlZXBFeHBsb3JlQXJyYXkoaXRlbSwgMyk7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIG9iaiAhPT0gJ3N0cmluZycpIHtcblx0XHRcdFx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBpdGVtIHR5cGUnKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0cmV0dXJuIG9iajtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBlbHNlIGlmIChcblx0XHRcdFx0XHR0ZXh0Lmxlbmd0aCA9PT0gMSAmJlxuXHRcdFx0XHRcdHR5cGVvZiByYXdSZXNwID09PSAnb2JqZWN0JyAmJlxuXHRcdFx0XHRcdHJhd1Jlc3AgIT09IG51bGwgJiZcblx0XHRcdFx0XHQnc2VudGVuY2VzJyBpbiByYXdSZXNwXG5cdFx0XHRcdCkge1xuXHRcdFx0XHRcdC8vIEhhbmRsZSBvbmUgdGV4dFxuXHRcdFx0XHRcdGNvbnN0IHNlbnRlbmNlcyA9IChyYXdSZXNwIGFzIGFueSkuc2VudGVuY2VzIGFzIHVua25vd247XG5cdFx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KHNlbnRlbmNlcykpIHtcblx0XHRcdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgcmVzcG9uc2UnKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdCB0cmFuc2xhdGVkVGV4dCA9IHNlbnRlbmNlc1xuXHRcdFx0XHRcdFx0LnNsaWNlKDAsIC0xKVxuXHRcdFx0XHRcdFx0Lm1hcCgoc2VudGVuY2UpID0+IHtcblx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBzZW50ZW5jZSAhPT0gJ29iamVjdCcgfHwgISgndHJhbnMnIGluIHNlbnRlbmNlKSkge1xuXHRcdFx0XHRcdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgcmVzcG9uc2UnKTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdHJldHVybiBzZW50ZW5jZS50cmFucztcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQuam9pbignJyk7XG5cblx0XHRcdFx0XHRyZXR1cm4gW3RyYW5zbGF0ZWRUZXh0XTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgcmVzcG9uc2UnKTtcblx0XHRcdH0pO1xuXHR9XG59XG4iXSwiZmlsZSI6InRyYW5zbGF0b3JzL0dvb2dsZVRyYW5zbGF0b3IvaW5kZXguanMifQ==


/***/ }),

/***/ 357:
/***/ (function(module) {

module.exports = require("assert");

/***/ }),

/***/ 387:
/***/ (function(__unusedmodule, exports) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getToken = getToken;
// TKK value from https://github.com/FilipePS/Traduzir-paginas-web/blob/f3a4956a1aa96b7a9124864158a5200827694521/background/translationService.js
const googleTranslateTKK = '448487.932609646'; //
// Obfuscated logic: START
//

/* eslint-disable no-bitwise */

function shiftLeftOrRightThenSumOrXor(num, optString) {
  for (let i = 0; i < optString.length - 2; i += 3) {
    let acc = optString.charAt(i + 2);

    if ('a' <= acc) {
      acc = acc.charCodeAt(0) - 87;
    } else {
      acc = Number(acc);
    }

    if (optString.charAt(i + 1) == '+') {
      acc = num >>> acc;
    } else {
      acc = num << acc;
    }

    if (optString.charAt(i) == '+') {
      num += acc & 4294967295;
    } else {
      num ^= acc;
    }
  }

  return num;
}

function transformQuery(query) {
  const bytesArray = [];
  let idx = [];

  for (let i = 0; i < query.length; i++) {
    let charCode = query.charCodeAt(i);

    if (128 > charCode) {
      bytesArray[idx++] = charCode;
    } else {
      if (2048 > charCode) {
        bytesArray[idx++] = charCode >> 6 | 192;
      } else {
        if (55296 == (charCode & 64512) && i + 1 < query.length && 56320 == (query.charCodeAt(i + 1) & 64512)) {
          charCode = 65536 + ((charCode & 1023) << 10) + (query.charCodeAt(++i) & 1023);
          bytesArray[idx++] = charCode >> 18 | 240;
          bytesArray[idx++] = charCode >> 12 & 63 | 128;
        } else {
          bytesArray[idx++] = charCode >> 12 | 224;
        }

        bytesArray[idx++] = charCode >> 6 & 63 | 128;
      }

      bytesArray[idx++] = charCode & 63 | 128;
    }
  }

  return bytesArray;
}

function calcHash(query, windowTkk) {
  const tkkSplited = windowTkk.split('.');
  const tkkIndex = Number(tkkSplited[0]) || 0;
  const tkkKey = Number(tkkSplited[1]) || 0;
  const bytesArray = transformQuery(query);
  let encondingRound = tkkIndex;

  for (let i = 0; i < bytesArray.length; i++) {
    encondingRound += bytesArray[i];
    encondingRound = shiftLeftOrRightThenSumOrXor(encondingRound, '+-a^+6');
  }

  encondingRound = shiftLeftOrRightThenSumOrXor(encondingRound, '+-3^+b+-f');
  encondingRound ^= tkkKey;

  if (encondingRound <= 0) {
    encondingRound = (encondingRound & 2147483647) + 2147483648;
  }

  const normalizedResult = encondingRound % 1000000;
  return normalizedResult.toString() + '.' + (normalizedResult ^ tkkIndex);
}
/* eslint-enable no-bitwise */
//
// Obfuscated logic: END
//


function getToken(query) {
  return new Promise(res => res({
    value: calcHash(query, googleTranslateTKK)
  }));
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRyYW5zbGF0b3JzL0dvb2dsZVRyYW5zbGF0b3IvdG9rZW4uanMiXSwibmFtZXMiOlsiZ29vZ2xlVHJhbnNsYXRlVEtLIiwic2hpZnRMZWZ0T3JSaWdodFRoZW5TdW1PclhvciIsIm51bSIsIm9wdFN0cmluZyIsImkiLCJsZW5ndGgiLCJhY2MiLCJjaGFyQXQiLCJjaGFyQ29kZUF0IiwiTnVtYmVyIiwidHJhbnNmb3JtUXVlcnkiLCJxdWVyeSIsImJ5dGVzQXJyYXkiLCJpZHgiLCJjaGFyQ29kZSIsImNhbGNIYXNoIiwid2luZG93VGtrIiwidGtrU3BsaXRlZCIsInNwbGl0IiwidGtrSW5kZXgiLCJ0a2tLZXkiLCJlbmNvbmRpbmdSb3VuZCIsIm5vcm1hbGl6ZWRSZXN1bHQiLCJ0b1N0cmluZyIsImdldFRva2VuIiwiUHJvbWlzZSIsInJlcyIsInZhbHVlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTtBQUNBLE1BQU1BLGtCQUFrQixHQUFHLGtCQUEzQixDLENBRUE7QUFDQTtBQUNBOztBQUNBOztBQUVBLFNBQVNDLDRCQUFULENBQXNDQyxHQUF0QyxFQUEyQ0MsU0FBM0MsRUFBc0Q7QUFDckQsT0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHRCxTQUFTLENBQUNFLE1BQVYsR0FBbUIsQ0FBdkMsRUFBMENELENBQUMsSUFBSSxDQUEvQyxFQUFrRDtBQUNqRCxRQUFJRSxHQUFHLEdBQUdILFNBQVMsQ0FBQ0ksTUFBVixDQUFpQkgsQ0FBQyxHQUFHLENBQXJCLENBQVY7O0FBQ0EsUUFBSSxPQUFPRSxHQUFYLEVBQWdCO0FBQ2ZBLE1BQUFBLEdBQUcsR0FBR0EsR0FBRyxDQUFDRSxVQUFKLENBQWUsQ0FBZixJQUFvQixFQUExQjtBQUNBLEtBRkQsTUFFTztBQUNORixNQUFBQSxHQUFHLEdBQUdHLE1BQU0sQ0FBQ0gsR0FBRCxDQUFaO0FBQ0E7O0FBQ0QsUUFBSUgsU0FBUyxDQUFDSSxNQUFWLENBQWlCSCxDQUFDLEdBQUcsQ0FBckIsS0FBMkIsR0FBL0IsRUFBb0M7QUFDbkNFLE1BQUFBLEdBQUcsR0FBR0osR0FBRyxLQUFLSSxHQUFkO0FBQ0EsS0FGRCxNQUVPO0FBQ05BLE1BQUFBLEdBQUcsR0FBR0osR0FBRyxJQUFJSSxHQUFiO0FBQ0E7O0FBQ0QsUUFBSUgsU0FBUyxDQUFDSSxNQUFWLENBQWlCSCxDQUFqQixLQUF1QixHQUEzQixFQUFnQztBQUMvQkYsTUFBQUEsR0FBRyxJQUFJSSxHQUFHLEdBQUcsVUFBYjtBQUNBLEtBRkQsTUFFTztBQUNOSixNQUFBQSxHQUFHLElBQUlJLEdBQVA7QUFDQTtBQUNEOztBQUNELFNBQU9KLEdBQVA7QUFDQTs7QUFFRCxTQUFTUSxjQUFULENBQXdCQyxLQUF4QixFQUErQjtBQUM5QixRQUFNQyxVQUFVLEdBQUcsRUFBbkI7QUFDQSxNQUFJQyxHQUFHLEdBQUcsRUFBVjs7QUFDQSxPQUFLLElBQUlULENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdPLEtBQUssQ0FBQ04sTUFBMUIsRUFBa0NELENBQUMsRUFBbkMsRUFBdUM7QUFDdEMsUUFBSVUsUUFBUSxHQUFHSCxLQUFLLENBQUNILFVBQU4sQ0FBaUJKLENBQWpCLENBQWY7O0FBRUEsUUFBSSxNQUFNVSxRQUFWLEVBQW9CO0FBQ25CRixNQUFBQSxVQUFVLENBQUNDLEdBQUcsRUFBSixDQUFWLEdBQW9CQyxRQUFwQjtBQUNBLEtBRkQsTUFFTztBQUNOLFVBQUksT0FBT0EsUUFBWCxFQUFxQjtBQUNwQkYsUUFBQUEsVUFBVSxDQUFDQyxHQUFHLEVBQUosQ0FBVixHQUFxQkMsUUFBUSxJQUFJLENBQWIsR0FBa0IsR0FBdEM7QUFDQSxPQUZELE1BRU87QUFDTixZQUNDLFVBQVVBLFFBQVEsR0FBRyxLQUFyQixLQUNBVixDQUFDLEdBQUcsQ0FBSixHQUFRTyxLQUFLLENBQUNOLE1BRGQsSUFFQSxVQUFVTSxLQUFLLENBQUNILFVBQU4sQ0FBaUJKLENBQUMsR0FBRyxDQUFyQixJQUEwQixLQUFwQyxDQUhELEVBSUU7QUFDRFUsVUFBQUEsUUFBUSxHQUNQLFNBQ0MsQ0FBQ0EsUUFBUSxHQUFHLElBQVosS0FBcUIsRUFEdEIsS0FFQ0gsS0FBSyxDQUFDSCxVQUFOLENBQWlCLEVBQUVKLENBQW5CLElBQXdCLElBRnpCLENBREQ7QUFJQVEsVUFBQUEsVUFBVSxDQUFDQyxHQUFHLEVBQUosQ0FBVixHQUFxQkMsUUFBUSxJQUFJLEVBQWIsR0FBbUIsR0FBdkM7QUFDQUYsVUFBQUEsVUFBVSxDQUFDQyxHQUFHLEVBQUosQ0FBVixHQUFzQkMsUUFBUSxJQUFJLEVBQWIsR0FBbUIsRUFBcEIsR0FBMEIsR0FBOUM7QUFDQSxTQVhELE1BV087QUFDTkYsVUFBQUEsVUFBVSxDQUFDQyxHQUFHLEVBQUosQ0FBVixHQUFxQkMsUUFBUSxJQUFJLEVBQWIsR0FBbUIsR0FBdkM7QUFDQTs7QUFDREYsUUFBQUEsVUFBVSxDQUFDQyxHQUFHLEVBQUosQ0FBVixHQUFzQkMsUUFBUSxJQUFJLENBQWIsR0FBa0IsRUFBbkIsR0FBeUIsR0FBN0M7QUFDQTs7QUFDREYsTUFBQUEsVUFBVSxDQUFDQyxHQUFHLEVBQUosQ0FBVixHQUFxQkMsUUFBUSxHQUFHLEVBQVosR0FBa0IsR0FBdEM7QUFDQTtBQUNEOztBQUNELFNBQU9GLFVBQVA7QUFDQTs7QUFFRCxTQUFTRyxRQUFULENBQWtCSixLQUFsQixFQUF5QkssU0FBekIsRUFBb0M7QUFDbkMsUUFBTUMsVUFBVSxHQUFHRCxTQUFTLENBQUNFLEtBQVYsQ0FBZ0IsR0FBaEIsQ0FBbkI7QUFDQSxRQUFNQyxRQUFRLEdBQUdWLE1BQU0sQ0FBQ1EsVUFBVSxDQUFDLENBQUQsQ0FBWCxDQUFOLElBQXlCLENBQTFDO0FBQ0EsUUFBTUcsTUFBTSxHQUFHWCxNQUFNLENBQUNRLFVBQVUsQ0FBQyxDQUFELENBQVgsQ0FBTixJQUF5QixDQUF4QztBQUVBLFFBQU1MLFVBQVUsR0FBR0YsY0FBYyxDQUFDQyxLQUFELENBQWpDO0FBRUEsTUFBSVUsY0FBYyxHQUFHRixRQUFyQjs7QUFDQSxPQUFLLElBQUlmLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdRLFVBQVUsQ0FBQ1AsTUFBL0IsRUFBdUNELENBQUMsRUFBeEMsRUFBNEM7QUFDM0NpQixJQUFBQSxjQUFjLElBQUlULFVBQVUsQ0FBQ1IsQ0FBRCxDQUE1QjtBQUNBaUIsSUFBQUEsY0FBYyxHQUFHcEIsNEJBQTRCLENBQUNvQixjQUFELEVBQWlCLFFBQWpCLENBQTdDO0FBQ0E7O0FBQ0RBLEVBQUFBLGNBQWMsR0FBR3BCLDRCQUE0QixDQUFDb0IsY0FBRCxFQUFpQixXQUFqQixDQUE3QztBQUVBQSxFQUFBQSxjQUFjLElBQUlELE1BQWxCOztBQUNBLE1BQUlDLGNBQWMsSUFBSSxDQUF0QixFQUF5QjtBQUN4QkEsSUFBQUEsY0FBYyxHQUFHLENBQUNBLGNBQWMsR0FBRyxVQUFsQixJQUFnQyxVQUFqRDtBQUNBOztBQUVELFFBQU1DLGdCQUFnQixHQUFHRCxjQUFjLEdBQUcsT0FBMUM7QUFDQSxTQUFPQyxnQkFBZ0IsQ0FBQ0MsUUFBakIsS0FBOEIsR0FBOUIsSUFBcUNELGdCQUFnQixHQUFHSCxRQUF4RCxDQUFQO0FBQ0E7QUFFRDtBQUNBO0FBQ0E7QUFDQTs7O0FBRU8sU0FBU0ssUUFBVCxDQUFrQmIsS0FBbEIsRUFBeUI7QUFDL0IsU0FBTyxJQUFJYyxPQUFKLENBQWFDLEdBQUQsSUFBU0EsR0FBRyxDQUFDO0FBQUVDLElBQUFBLEtBQUssRUFBRVosUUFBUSxDQUFDSixLQUFELEVBQVFYLGtCQUFSO0FBQWpCLEdBQUQsQ0FBeEIsQ0FBUDtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVEtLIHZhbHVlIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL0ZpbGlwZVBTL1RyYWR1emlyLXBhZ2luYXMtd2ViL2Jsb2IvZjNhNDk1NmExYWE5NmI3YTkxMjQ4NjQxNThhNTIwMDgyNzY5NDUyMS9iYWNrZ3JvdW5kL3RyYW5zbGF0aW9uU2VydmljZS5qc1xuY29uc3QgZ29vZ2xlVHJhbnNsYXRlVEtLID0gJzQ0ODQ4Ny45MzI2MDk2NDYnO1xuXG4vL1xuLy8gT2JmdXNjYXRlZCBsb2dpYzogU1RBUlRcbi8vXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1iaXR3aXNlICovXG5cbmZ1bmN0aW9uIHNoaWZ0TGVmdE9yUmlnaHRUaGVuU3VtT3JYb3IobnVtLCBvcHRTdHJpbmcpIHtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBvcHRTdHJpbmcubGVuZ3RoIC0gMjsgaSArPSAzKSB7XG5cdFx0bGV0IGFjYyA9IG9wdFN0cmluZy5jaGFyQXQoaSArIDIpO1xuXHRcdGlmICgnYScgPD0gYWNjKSB7XG5cdFx0XHRhY2MgPSBhY2MuY2hhckNvZGVBdCgwKSAtIDg3O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhY2MgPSBOdW1iZXIoYWNjKTtcblx0XHR9XG5cdFx0aWYgKG9wdFN0cmluZy5jaGFyQXQoaSArIDEpID09ICcrJykge1xuXHRcdFx0YWNjID0gbnVtID4+PiBhY2M7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFjYyA9IG51bSA8PCBhY2M7XG5cdFx0fVxuXHRcdGlmIChvcHRTdHJpbmcuY2hhckF0KGkpID09ICcrJykge1xuXHRcdFx0bnVtICs9IGFjYyAmIDQyOTQ5NjcyOTU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG51bSBePSBhY2M7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBudW07XG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybVF1ZXJ5KHF1ZXJ5KSB7XG5cdGNvbnN0IGJ5dGVzQXJyYXkgPSBbXTtcblx0bGV0IGlkeCA9IFtdO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IHF1ZXJ5Lmxlbmd0aDsgaSsrKSB7XG5cdFx0bGV0IGNoYXJDb2RlID0gcXVlcnkuY2hhckNvZGVBdChpKTtcblxuXHRcdGlmICgxMjggPiBjaGFyQ29kZSkge1xuXHRcdFx0Ynl0ZXNBcnJheVtpZHgrK10gPSBjaGFyQ29kZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKDIwNDggPiBjaGFyQ29kZSkge1xuXHRcdFx0XHRieXRlc0FycmF5W2lkeCsrXSA9IChjaGFyQ29kZSA+PiA2KSB8IDE5Mjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChcblx0XHRcdFx0XHQ1NTI5NiA9PSAoY2hhckNvZGUgJiA2NDUxMikgJiZcblx0XHRcdFx0XHRpICsgMSA8IHF1ZXJ5Lmxlbmd0aCAmJlxuXHRcdFx0XHRcdDU2MzIwID09IChxdWVyeS5jaGFyQ29kZUF0KGkgKyAxKSAmIDY0NTEyKVxuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHRjaGFyQ29kZSA9XG5cdFx0XHRcdFx0XHQ2NTUzNiArXG5cdFx0XHRcdFx0XHQoKGNoYXJDb2RlICYgMTAyMykgPDwgMTApICtcblx0XHRcdFx0XHRcdChxdWVyeS5jaGFyQ29kZUF0KCsraSkgJiAxMDIzKTtcblx0XHRcdFx0XHRieXRlc0FycmF5W2lkeCsrXSA9IChjaGFyQ29kZSA+PiAxOCkgfCAyNDA7XG5cdFx0XHRcdFx0Ynl0ZXNBcnJheVtpZHgrK10gPSAoKGNoYXJDb2RlID4+IDEyKSAmIDYzKSB8IDEyODtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRieXRlc0FycmF5W2lkeCsrXSA9IChjaGFyQ29kZSA+PiAxMikgfCAyMjQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ynl0ZXNBcnJheVtpZHgrK10gPSAoKGNoYXJDb2RlID4+IDYpICYgNjMpIHwgMTI4O1xuXHRcdFx0fVxuXHRcdFx0Ynl0ZXNBcnJheVtpZHgrK10gPSAoY2hhckNvZGUgJiA2MykgfCAxMjg7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBieXRlc0FycmF5O1xufVxuXG5mdW5jdGlvbiBjYWxjSGFzaChxdWVyeSwgd2luZG93VGtrKSB7XG5cdGNvbnN0IHRra1NwbGl0ZWQgPSB3aW5kb3dUa2suc3BsaXQoJy4nKTtcblx0Y29uc3QgdGtrSW5kZXggPSBOdW1iZXIodGtrU3BsaXRlZFswXSkgfHwgMDtcblx0Y29uc3QgdGtrS2V5ID0gTnVtYmVyKHRra1NwbGl0ZWRbMV0pIHx8IDA7XG5cblx0Y29uc3QgYnl0ZXNBcnJheSA9IHRyYW5zZm9ybVF1ZXJ5KHF1ZXJ5KTtcblxuXHRsZXQgZW5jb25kaW5nUm91bmQgPSB0a2tJbmRleDtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBieXRlc0FycmF5Lmxlbmd0aDsgaSsrKSB7XG5cdFx0ZW5jb25kaW5nUm91bmQgKz0gYnl0ZXNBcnJheVtpXTtcblx0XHRlbmNvbmRpbmdSb3VuZCA9IHNoaWZ0TGVmdE9yUmlnaHRUaGVuU3VtT3JYb3IoZW5jb25kaW5nUm91bmQsICcrLWFeKzYnKTtcblx0fVxuXHRlbmNvbmRpbmdSb3VuZCA9IHNoaWZ0TGVmdE9yUmlnaHRUaGVuU3VtT3JYb3IoZW5jb25kaW5nUm91bmQsICcrLTNeK2IrLWYnKTtcblxuXHRlbmNvbmRpbmdSb3VuZCBePSB0a2tLZXk7XG5cdGlmIChlbmNvbmRpbmdSb3VuZCA8PSAwKSB7XG5cdFx0ZW5jb25kaW5nUm91bmQgPSAoZW5jb25kaW5nUm91bmQgJiAyMTQ3NDgzNjQ3KSArIDIxNDc0ODM2NDg7XG5cdH1cblxuXHRjb25zdCBub3JtYWxpemVkUmVzdWx0ID0gZW5jb25kaW5nUm91bmQgJSAxMDAwMDAwO1xuXHRyZXR1cm4gbm9ybWFsaXplZFJlc3VsdC50b1N0cmluZygpICsgJy4nICsgKG5vcm1hbGl6ZWRSZXN1bHQgXiB0a2tJbmRleCk7XG59XG5cbi8qIGVzbGludC1lbmFibGUgbm8tYml0d2lzZSAqL1xuLy9cbi8vIE9iZnVzY2F0ZWQgbG9naWM6IEVORFxuLy9cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRva2VuKHF1ZXJ5KSB7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzKSA9PiByZXMoeyB2YWx1ZTogY2FsY0hhc2gocXVlcnksIGdvb2dsZVRyYW5zbGF0ZVRLSykgfSkpO1xufVxuIl0sImZpbGUiOiJ0cmFuc2xhdG9ycy9Hb29nbGVUcmFuc2xhdG9yL3Rva2VuLmpzIn0=


/***/ }),

/***/ 413:
/***/ (function(module) {

module.exports = require("stream");

/***/ }),

/***/ 437:
/***/ (function(module, __unusedexports, __webpack_require__) {

const fs = __webpack_require__(747)
const path = __webpack_require__(622)
const os = __webpack_require__(87)

const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg

// Parser src into an Object
function parse (src) {
  const obj = {}

  // Convert buffer to string
  let lines = src.toString()

  // Convert line breaks to same format
  lines = lines.replace(/\r\n?/mg, '\n')

  let match
  while ((match = LINE.exec(lines)) != null) {
    const key = match[1]

    // Default undefined or null to empty string
    let value = (match[2] || '')

    // Remove whitespace
    value = value.trim()

    // Check if double quoted
    const maybeQuote = value[0]

    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2')

    // Expand newlines if double quoted
    if (maybeQuote === '"') {
      value = value.replace(/\\n/g, '\n')
      value = value.replace(/\\r/g, '\r')
    }

    // Add to object
    obj[key] = value
  }

  return obj
}

function _log (message) {
  console.log(`[dotenv][DEBUG] ${message}`)
}

function _resolveHome (envPath) {
  return envPath[0] === '~' ? path.join(os.homedir(), envPath.slice(1)) : envPath
}

// Populates process.env from .env file
function config (options) {
  let dotenvPath = path.resolve(process.cwd(), '.env')
  let encoding = 'utf8'
  const debug = Boolean(options && options.debug)
  const override = Boolean(options && options.override)

  if (options) {
    if (options.path != null) {
      dotenvPath = _resolveHome(options.path)
    }
    if (options.encoding != null) {
      encoding = options.encoding
    }
  }

  try {
    // Specifying an encoding returns a string instead of a buffer
    const parsed = DotenvModule.parse(fs.readFileSync(dotenvPath, { encoding }))

    Object.keys(parsed).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
        process.env[key] = parsed[key]
      } else {
        if (override === true) {
          process.env[key] = parsed[key]
        }

        if (debug) {
          if (override === true) {
            _log(`"${key}" is already defined in \`process.env\` and WAS overwritten`)
          } else {
            _log(`"${key}" is already defined in \`process.env\` and was NOT overwritten`)
          }
        }
      }
    })

    return { parsed }
  } catch (e) {
    if (debug) {
      _log(`Failed to load ${dotenvPath} ${e.message}`)
    }

    return { error: e }
  }
}

const DotenvModule = {
  config,
  parse
}

module.exports.config = DotenvModule.config
module.exports.parse = DotenvModule.parse
module.exports = DotenvModule


/***/ }),

/***/ 454:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);
var settle = __webpack_require__(70);
var cookies = __webpack_require__(169);
var buildURL = __webpack_require__(646);
var buildFullPath = __webpack_require__(934);
var parseHeaders = __webpack_require__(455);
var isURLSameOrigin = __webpack_require__(608);
var createError = __webpack_require__(226);
var defaults = __webpack_require__(190);
var Cancel = __webpack_require__(875);

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;
    var responseType = config.responseType;
    var onCanceled;
    function done() {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled);
      }

      if (config.signal) {
        config.signal.removeEventListener('abort', onCanceled);
      }
    }

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    var fullPath = buildFullPath(config.baseURL, config.url);
    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    function onloadend() {
      if (!request) {
        return;
      }
      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
        request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);

      // Clean up request
      request = null;
    }

    if ('onloadend' in request) {
      // Use onloadend if available
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'
        setTimeout(onloadend);
      };
    }

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(createError('Request aborted', config, 'ECONNABORTED', request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
      var transitional = config.transitional || defaults.transitional;
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage;
      }
      reject(createError(
        timeoutErrorMessage,
        config,
        transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
        cookies.read(config.xsrfCookieName) :
        undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials;
    }

    // Add responseType to request if needed
    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType;
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken || config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = function(cancel) {
        if (!request) {
          return;
        }
        reject(!cancel || (cancel && cancel.type) ? new Cancel('canceled') : cancel);
        request.abort();
        request = null;
      };

      config.cancelToken && config.cancelToken.subscribe(onCanceled);
      if (config.signal) {
        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
      }
    }

    if (!requestData) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};


/***/ }),

/***/ 455:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};


/***/ }),

/***/ 467:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var Stream = _interopDefault(__webpack_require__(413));
var http = _interopDefault(__webpack_require__(605));
var Url = _interopDefault(__webpack_require__(835));
var https = _interopDefault(__webpack_require__(211));
var zlib = _interopDefault(__webpack_require__(761));

// Based on https://github.com/tmpvar/jsdom/blob/aa85b2abf07766ff7bf5c1f6daafb3726f2f2db5/lib/jsdom/living/blob.js

// fix for "Readable" isn't a named export issue
const Readable = Stream.Readable;

const BUFFER = Symbol('buffer');
const TYPE = Symbol('type');

class Blob {
	constructor() {
		this[TYPE] = '';

		const blobParts = arguments[0];
		const options = arguments[1];

		const buffers = [];
		let size = 0;

		if (blobParts) {
			const a = blobParts;
			const length = Number(a.length);
			for (let i = 0; i < length; i++) {
				const element = a[i];
				let buffer;
				if (element instanceof Buffer) {
					buffer = element;
				} else if (ArrayBuffer.isView(element)) {
					buffer = Buffer.from(element.buffer, element.byteOffset, element.byteLength);
				} else if (element instanceof ArrayBuffer) {
					buffer = Buffer.from(element);
				} else if (element instanceof Blob) {
					buffer = element[BUFFER];
				} else {
					buffer = Buffer.from(typeof element === 'string' ? element : String(element));
				}
				size += buffer.length;
				buffers.push(buffer);
			}
		}

		this[BUFFER] = Buffer.concat(buffers);

		let type = options && options.type !== undefined && String(options.type).toLowerCase();
		if (type && !/[^\u0020-\u007E]/.test(type)) {
			this[TYPE] = type;
		}
	}
	get size() {
		return this[BUFFER].length;
	}
	get type() {
		return this[TYPE];
	}
	text() {
		return Promise.resolve(this[BUFFER].toString());
	}
	arrayBuffer() {
		const buf = this[BUFFER];
		const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		return Promise.resolve(ab);
	}
	stream() {
		const readable = new Readable();
		readable._read = function () {};
		readable.push(this[BUFFER]);
		readable.push(null);
		return readable;
	}
	toString() {
		return '[object Blob]';
	}
	slice() {
		const size = this.size;

		const start = arguments[0];
		const end = arguments[1];
		let relativeStart, relativeEnd;
		if (start === undefined) {
			relativeStart = 0;
		} else if (start < 0) {
			relativeStart = Math.max(size + start, 0);
		} else {
			relativeStart = Math.min(start, size);
		}
		if (end === undefined) {
			relativeEnd = size;
		} else if (end < 0) {
			relativeEnd = Math.max(size + end, 0);
		} else {
			relativeEnd = Math.min(end, size);
		}
		const span = Math.max(relativeEnd - relativeStart, 0);

		const buffer = this[BUFFER];
		const slicedBuffer = buffer.slice(relativeStart, relativeStart + span);
		const blob = new Blob([], { type: arguments[2] });
		blob[BUFFER] = slicedBuffer;
		return blob;
	}
}

Object.defineProperties(Blob.prototype, {
	size: { enumerable: true },
	type: { enumerable: true },
	slice: { enumerable: true }
});

Object.defineProperty(Blob.prototype, Symbol.toStringTag, {
	value: 'Blob',
	writable: false,
	enumerable: false,
	configurable: true
});

/**
 * fetch-error.js
 *
 * FetchError interface for operational errors
 */

/**
 * Create FetchError instance
 *
 * @param   String      message      Error message for human
 * @param   String      type         Error type for machine
 * @param   String      systemError  For Node.js system error
 * @return  FetchError
 */
function FetchError(message, type, systemError) {
  Error.call(this, message);

  this.message = message;
  this.type = type;

  // when err.type is `system`, err.code contains system error code
  if (systemError) {
    this.code = this.errno = systemError.code;
  }

  // hide custom error implementation details from end-users
  Error.captureStackTrace(this, this.constructor);
}

FetchError.prototype = Object.create(Error.prototype);
FetchError.prototype.constructor = FetchError;
FetchError.prototype.name = 'FetchError';

let convert;
try {
	convert = __webpack_require__(877).convert;
} catch (e) {}

const INTERNALS = Symbol('Body internals');

// fix an issue where "PassThrough" isn't a named export for node <10
const PassThrough = Stream.PassThrough;

/**
 * Body mixin
 *
 * Ref: https://fetch.spec.whatwg.org/#body
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
function Body(body) {
	var _this = this;

	var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
	    _ref$size = _ref.size;

	let size = _ref$size === undefined ? 0 : _ref$size;
	var _ref$timeout = _ref.timeout;
	let timeout = _ref$timeout === undefined ? 0 : _ref$timeout;

	if (body == null) {
		// body is undefined or null
		body = null;
	} else if (isURLSearchParams(body)) {
		// body is a URLSearchParams
		body = Buffer.from(body.toString());
	} else if (isBlob(body)) ; else if (Buffer.isBuffer(body)) ; else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
		// body is ArrayBuffer
		body = Buffer.from(body);
	} else if (ArrayBuffer.isView(body)) {
		// body is ArrayBufferView
		body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
	} else if (body instanceof Stream) ; else {
		// none of the above
		// coerce to string then buffer
		body = Buffer.from(String(body));
	}
	this[INTERNALS] = {
		body,
		disturbed: false,
		error: null
	};
	this.size = size;
	this.timeout = timeout;

	if (body instanceof Stream) {
		body.on('error', function (err) {
			const error = err.name === 'AbortError' ? err : new FetchError(`Invalid response body while trying to fetch ${_this.url}: ${err.message}`, 'system', err);
			_this[INTERNALS].error = error;
		});
	}
}

Body.prototype = {
	get body() {
		return this[INTERNALS].body;
	},

	get bodyUsed() {
		return this[INTERNALS].disturbed;
	},

	/**
  * Decode response as ArrayBuffer
  *
  * @return  Promise
  */
	arrayBuffer() {
		return consumeBody.call(this).then(function (buf) {
			return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		});
	},

	/**
  * Return raw response as Blob
  *
  * @return Promise
  */
	blob() {
		let ct = this.headers && this.headers.get('content-type') || '';
		return consumeBody.call(this).then(function (buf) {
			return Object.assign(
			// Prevent copying
			new Blob([], {
				type: ct.toLowerCase()
			}), {
				[BUFFER]: buf
			});
		});
	},

	/**
  * Decode response as json
  *
  * @return  Promise
  */
	json() {
		var _this2 = this;

		return consumeBody.call(this).then(function (buffer) {
			try {
				return JSON.parse(buffer.toString());
			} catch (err) {
				return Body.Promise.reject(new FetchError(`invalid json response body at ${_this2.url} reason: ${err.message}`, 'invalid-json'));
			}
		});
	},

	/**
  * Decode response as text
  *
  * @return  Promise
  */
	text() {
		return consumeBody.call(this).then(function (buffer) {
			return buffer.toString();
		});
	},

	/**
  * Decode response as buffer (non-spec api)
  *
  * @return  Promise
  */
	buffer() {
		return consumeBody.call(this);
	},

	/**
  * Decode response as text, while automatically detecting the encoding and
  * trying to decode to UTF-8 (non-spec api)
  *
  * @return  Promise
  */
	textConverted() {
		var _this3 = this;

		return consumeBody.call(this).then(function (buffer) {
			return convertBody(buffer, _this3.headers);
		});
	}
};

// In browsers, all properties are enumerable.
Object.defineProperties(Body.prototype, {
	body: { enumerable: true },
	bodyUsed: { enumerable: true },
	arrayBuffer: { enumerable: true },
	blob: { enumerable: true },
	json: { enumerable: true },
	text: { enumerable: true }
});

Body.mixIn = function (proto) {
	for (const name of Object.getOwnPropertyNames(Body.prototype)) {
		// istanbul ignore else: future proof
		if (!(name in proto)) {
			const desc = Object.getOwnPropertyDescriptor(Body.prototype, name);
			Object.defineProperty(proto, name, desc);
		}
	}
};

/**
 * Consume and convert an entire Body to a Buffer.
 *
 * Ref: https://fetch.spec.whatwg.org/#concept-body-consume-body
 *
 * @return  Promise
 */
function consumeBody() {
	var _this4 = this;

	if (this[INTERNALS].disturbed) {
		return Body.Promise.reject(new TypeError(`body used already for: ${this.url}`));
	}

	this[INTERNALS].disturbed = true;

	if (this[INTERNALS].error) {
		return Body.Promise.reject(this[INTERNALS].error);
	}

	let body = this.body;

	// body is null
	if (body === null) {
		return Body.Promise.resolve(Buffer.alloc(0));
	}

	// body is blob
	if (isBlob(body)) {
		body = body.stream();
	}

	// body is buffer
	if (Buffer.isBuffer(body)) {
		return Body.Promise.resolve(body);
	}

	// istanbul ignore if: should never happen
	if (!(body instanceof Stream)) {
		return Body.Promise.resolve(Buffer.alloc(0));
	}

	// body is stream
	// get ready to actually consume the body
	let accum = [];
	let accumBytes = 0;
	let abort = false;

	return new Body.Promise(function (resolve, reject) {
		let resTimeout;

		// allow timeout on slow response body
		if (_this4.timeout) {
			resTimeout = setTimeout(function () {
				abort = true;
				reject(new FetchError(`Response timeout while trying to fetch ${_this4.url} (over ${_this4.timeout}ms)`, 'body-timeout'));
			}, _this4.timeout);
		}

		// handle stream errors
		body.on('error', function (err) {
			if (err.name === 'AbortError') {
				// if the request was aborted, reject with this Error
				abort = true;
				reject(err);
			} else {
				// other errors, such as incorrect content-encoding
				reject(new FetchError(`Invalid response body while trying to fetch ${_this4.url}: ${err.message}`, 'system', err));
			}
		});

		body.on('data', function (chunk) {
			if (abort || chunk === null) {
				return;
			}

			if (_this4.size && accumBytes + chunk.length > _this4.size) {
				abort = true;
				reject(new FetchError(`content size at ${_this4.url} over limit: ${_this4.size}`, 'max-size'));
				return;
			}

			accumBytes += chunk.length;
			accum.push(chunk);
		});

		body.on('end', function () {
			if (abort) {
				return;
			}

			clearTimeout(resTimeout);

			try {
				resolve(Buffer.concat(accum, accumBytes));
			} catch (err) {
				// handle streams that have accumulated too much data (issue #414)
				reject(new FetchError(`Could not create Buffer from response body for ${_this4.url}: ${err.message}`, 'system', err));
			}
		});
	});
}

/**
 * Detect buffer encoding and convert to target encoding
 * ref: http://www.w3.org/TR/2011/WD-html5-20110113/parsing.html#determining-the-character-encoding
 *
 * @param   Buffer  buffer    Incoming buffer
 * @param   String  encoding  Target encoding
 * @return  String
 */
function convertBody(buffer, headers) {
	if (typeof convert !== 'function') {
		throw new Error('The package `encoding` must be installed to use the textConverted() function');
	}

	const ct = headers.get('content-type');
	let charset = 'utf-8';
	let res, str;

	// header
	if (ct) {
		res = /charset=([^;]*)/i.exec(ct);
	}

	// no charset in content type, peek at response body for at most 1024 bytes
	str = buffer.slice(0, 1024).toString();

	// html5
	if (!res && str) {
		res = /<meta.+?charset=(['"])(.+?)\1/i.exec(str);
	}

	// html4
	if (!res && str) {
		res = /<meta[\s]+?http-equiv=(['"])content-type\1[\s]+?content=(['"])(.+?)\2/i.exec(str);
		if (!res) {
			res = /<meta[\s]+?content=(['"])(.+?)\1[\s]+?http-equiv=(['"])content-type\3/i.exec(str);
			if (res) {
				res.pop(); // drop last quote
			}
		}

		if (res) {
			res = /charset=(.*)/i.exec(res.pop());
		}
	}

	// xml
	if (!res && str) {
		res = /<\?xml.+?encoding=(['"])(.+?)\1/i.exec(str);
	}

	// found charset
	if (res) {
		charset = res.pop();

		// prevent decode issues when sites use incorrect encoding
		// ref: https://hsivonen.fi/encoding-menu/
		if (charset === 'gb2312' || charset === 'gbk') {
			charset = 'gb18030';
		}
	}

	// turn raw buffers into a single utf-8 buffer
	return convert(buffer, 'UTF-8', charset).toString();
}

/**
 * Detect a URLSearchParams object
 * ref: https://github.com/bitinn/node-fetch/issues/296#issuecomment-307598143
 *
 * @param   Object  obj     Object to detect by type or brand
 * @return  String
 */
function isURLSearchParams(obj) {
	// Duck-typing as a necessary condition.
	if (typeof obj !== 'object' || typeof obj.append !== 'function' || typeof obj.delete !== 'function' || typeof obj.get !== 'function' || typeof obj.getAll !== 'function' || typeof obj.has !== 'function' || typeof obj.set !== 'function') {
		return false;
	}

	// Brand-checking and more duck-typing as optional condition.
	return obj.constructor.name === 'URLSearchParams' || Object.prototype.toString.call(obj) === '[object URLSearchParams]' || typeof obj.sort === 'function';
}

/**
 * Check if `obj` is a W3C `Blob` object (which `File` inherits from)
 * @param  {*} obj
 * @return {boolean}
 */
function isBlob(obj) {
	return typeof obj === 'object' && typeof obj.arrayBuffer === 'function' && typeof obj.type === 'string' && typeof obj.stream === 'function' && typeof obj.constructor === 'function' && typeof obj.constructor.name === 'string' && /^(Blob|File)$/.test(obj.constructor.name) && /^(Blob|File)$/.test(obj[Symbol.toStringTag]);
}

/**
 * Clone body given Res/Req instance
 *
 * @param   Mixed  instance  Response or Request instance
 * @return  Mixed
 */
function clone(instance) {
	let p1, p2;
	let body = instance.body;

	// don't allow cloning a used body
	if (instance.bodyUsed) {
		throw new Error('cannot clone body after it is used');
	}

	// check that body is a stream and not form-data object
	// note: we can't clone the form-data object without having it as a dependency
	if (body instanceof Stream && typeof body.getBoundary !== 'function') {
		// tee instance body
		p1 = new PassThrough();
		p2 = new PassThrough();
		body.pipe(p1);
		body.pipe(p2);
		// set instance body to teed body and return the other teed body
		instance[INTERNALS].body = p1;
		body = p2;
	}

	return body;
}

/**
 * Performs the operation "extract a `Content-Type` value from |object|" as
 * specified in the specification:
 * https://fetch.spec.whatwg.org/#concept-bodyinit-extract
 *
 * This function assumes that instance.body is present.
 *
 * @param   Mixed  instance  Any options.body input
 */
function extractContentType(body) {
	if (body === null) {
		// body is null
		return null;
	} else if (typeof body === 'string') {
		// body is string
		return 'text/plain;charset=UTF-8';
	} else if (isURLSearchParams(body)) {
		// body is a URLSearchParams
		return 'application/x-www-form-urlencoded;charset=UTF-8';
	} else if (isBlob(body)) {
		// body is blob
		return body.type || null;
	} else if (Buffer.isBuffer(body)) {
		// body is buffer
		return null;
	} else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
		// body is ArrayBuffer
		return null;
	} else if (ArrayBuffer.isView(body)) {
		// body is ArrayBufferView
		return null;
	} else if (typeof body.getBoundary === 'function') {
		// detect form data input from form-data module
		return `multipart/form-data;boundary=${body.getBoundary()}`;
	} else if (body instanceof Stream) {
		// body is stream
		// can't really do much about this
		return null;
	} else {
		// Body constructor defaults other things to string
		return 'text/plain;charset=UTF-8';
	}
}

/**
 * The Fetch Standard treats this as if "total bytes" is a property on the body.
 * For us, we have to explicitly get it with a function.
 *
 * ref: https://fetch.spec.whatwg.org/#concept-body-total-bytes
 *
 * @param   Body    instance   Instance of Body
 * @return  Number?            Number of bytes, or null if not possible
 */
function getTotalBytes(instance) {
	const body = instance.body;


	if (body === null) {
		// body is null
		return 0;
	} else if (isBlob(body)) {
		return body.size;
	} else if (Buffer.isBuffer(body)) {
		// body is buffer
		return body.length;
	} else if (body && typeof body.getLengthSync === 'function') {
		// detect form data input from form-data module
		if (body._lengthRetrievers && body._lengthRetrievers.length == 0 || // 1.x
		body.hasKnownLength && body.hasKnownLength()) {
			// 2.x
			return body.getLengthSync();
		}
		return null;
	} else {
		// body is stream
		return null;
	}
}

/**
 * Write a Body to a Node.js WritableStream (e.g. http.Request) object.
 *
 * @param   Body    instance   Instance of Body
 * @return  Void
 */
function writeToStream(dest, instance) {
	const body = instance.body;


	if (body === null) {
		// body is null
		dest.end();
	} else if (isBlob(body)) {
		body.stream().pipe(dest);
	} else if (Buffer.isBuffer(body)) {
		// body is buffer
		dest.write(body);
		dest.end();
	} else {
		// body is stream
		body.pipe(dest);
	}
}

// expose Promise
Body.Promise = global.Promise;

/**
 * headers.js
 *
 * Headers class offers convenient helpers
 */

const invalidTokenRegex = /[^\^_`a-zA-Z\-0-9!#$%&'*+.|~]/;
const invalidHeaderCharRegex = /[^\t\x20-\x7e\x80-\xff]/;

function validateName(name) {
	name = `${name}`;
	if (invalidTokenRegex.test(name) || name === '') {
		throw new TypeError(`${name} is not a legal HTTP header name`);
	}
}

function validateValue(value) {
	value = `${value}`;
	if (invalidHeaderCharRegex.test(value)) {
		throw new TypeError(`${value} is not a legal HTTP header value`);
	}
}

/**
 * Find the key in the map object given a header name.
 *
 * Returns undefined if not found.
 *
 * @param   String  name  Header name
 * @return  String|Undefined
 */
function find(map, name) {
	name = name.toLowerCase();
	for (const key in map) {
		if (key.toLowerCase() === name) {
			return key;
		}
	}
	return undefined;
}

const MAP = Symbol('map');
class Headers {
	/**
  * Headers class
  *
  * @param   Object  headers  Response headers
  * @return  Void
  */
	constructor() {
		let init = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;

		this[MAP] = Object.create(null);

		if (init instanceof Headers) {
			const rawHeaders = init.raw();
			const headerNames = Object.keys(rawHeaders);

			for (const headerName of headerNames) {
				for (const value of rawHeaders[headerName]) {
					this.append(headerName, value);
				}
			}

			return;
		}

		// We don't worry about converting prop to ByteString here as append()
		// will handle it.
		if (init == null) ; else if (typeof init === 'object') {
			const method = init[Symbol.iterator];
			if (method != null) {
				if (typeof method !== 'function') {
					throw new TypeError('Header pairs must be iterable');
				}

				// sequence<sequence<ByteString>>
				// Note: per spec we have to first exhaust the lists then process them
				const pairs = [];
				for (const pair of init) {
					if (typeof pair !== 'object' || typeof pair[Symbol.iterator] !== 'function') {
						throw new TypeError('Each header pair must be iterable');
					}
					pairs.push(Array.from(pair));
				}

				for (const pair of pairs) {
					if (pair.length !== 2) {
						throw new TypeError('Each header pair must be a name/value tuple');
					}
					this.append(pair[0], pair[1]);
				}
			} else {
				// record<ByteString, ByteString>
				for (const key of Object.keys(init)) {
					const value = init[key];
					this.append(key, value);
				}
			}
		} else {
			throw new TypeError('Provided initializer must be an object');
		}
	}

	/**
  * Return combined header value given name
  *
  * @param   String  name  Header name
  * @return  Mixed
  */
	get(name) {
		name = `${name}`;
		validateName(name);
		const key = find(this[MAP], name);
		if (key === undefined) {
			return null;
		}

		return this[MAP][key].join(', ');
	}

	/**
  * Iterate over all headers
  *
  * @param   Function  callback  Executed for each item with parameters (value, name, thisArg)
  * @param   Boolean   thisArg   `this` context for callback function
  * @return  Void
  */
	forEach(callback) {
		let thisArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;

		let pairs = getHeaders(this);
		let i = 0;
		while (i < pairs.length) {
			var _pairs$i = pairs[i];
			const name = _pairs$i[0],
			      value = _pairs$i[1];

			callback.call(thisArg, value, name, this);
			pairs = getHeaders(this);
			i++;
		}
	}

	/**
  * Overwrite header values given name
  *
  * @param   String  name   Header name
  * @param   String  value  Header value
  * @return  Void
  */
	set(name, value) {
		name = `${name}`;
		value = `${value}`;
		validateName(name);
		validateValue(value);
		const key = find(this[MAP], name);
		this[MAP][key !== undefined ? key : name] = [value];
	}

	/**
  * Append a value onto existing header
  *
  * @param   String  name   Header name
  * @param   String  value  Header value
  * @return  Void
  */
	append(name, value) {
		name = `${name}`;
		value = `${value}`;
		validateName(name);
		validateValue(value);
		const key = find(this[MAP], name);
		if (key !== undefined) {
			this[MAP][key].push(value);
		} else {
			this[MAP][name] = [value];
		}
	}

	/**
  * Check for header name existence
  *
  * @param   String   name  Header name
  * @return  Boolean
  */
	has(name) {
		name = `${name}`;
		validateName(name);
		return find(this[MAP], name) !== undefined;
	}

	/**
  * Delete all header values given name
  *
  * @param   String  name  Header name
  * @return  Void
  */
	delete(name) {
		name = `${name}`;
		validateName(name);
		const key = find(this[MAP], name);
		if (key !== undefined) {
			delete this[MAP][key];
		}
	}

	/**
  * Return raw headers (non-spec api)
  *
  * @return  Object
  */
	raw() {
		return this[MAP];
	}

	/**
  * Get an iterator on keys.
  *
  * @return  Iterator
  */
	keys() {
		return createHeadersIterator(this, 'key');
	}

	/**
  * Get an iterator on values.
  *
  * @return  Iterator
  */
	values() {
		return createHeadersIterator(this, 'value');
	}

	/**
  * Get an iterator on entries.
  *
  * This is the default iterator of the Headers object.
  *
  * @return  Iterator
  */
	[Symbol.iterator]() {
		return createHeadersIterator(this, 'key+value');
	}
}
Headers.prototype.entries = Headers.prototype[Symbol.iterator];

Object.defineProperty(Headers.prototype, Symbol.toStringTag, {
	value: 'Headers',
	writable: false,
	enumerable: false,
	configurable: true
});

Object.defineProperties(Headers.prototype, {
	get: { enumerable: true },
	forEach: { enumerable: true },
	set: { enumerable: true },
	append: { enumerable: true },
	has: { enumerable: true },
	delete: { enumerable: true },
	keys: { enumerable: true },
	values: { enumerable: true },
	entries: { enumerable: true }
});

function getHeaders(headers) {
	let kind = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'key+value';

	const keys = Object.keys(headers[MAP]).sort();
	return keys.map(kind === 'key' ? function (k) {
		return k.toLowerCase();
	} : kind === 'value' ? function (k) {
		return headers[MAP][k].join(', ');
	} : function (k) {
		return [k.toLowerCase(), headers[MAP][k].join(', ')];
	});
}

const INTERNAL = Symbol('internal');

function createHeadersIterator(target, kind) {
	const iterator = Object.create(HeadersIteratorPrototype);
	iterator[INTERNAL] = {
		target,
		kind,
		index: 0
	};
	return iterator;
}

const HeadersIteratorPrototype = Object.setPrototypeOf({
	next() {
		// istanbul ignore if
		if (!this || Object.getPrototypeOf(this) !== HeadersIteratorPrototype) {
			throw new TypeError('Value of `this` is not a HeadersIterator');
		}

		var _INTERNAL = this[INTERNAL];
		const target = _INTERNAL.target,
		      kind = _INTERNAL.kind,
		      index = _INTERNAL.index;

		const values = getHeaders(target, kind);
		const len = values.length;
		if (index >= len) {
			return {
				value: undefined,
				done: true
			};
		}

		this[INTERNAL].index = index + 1;

		return {
			value: values[index],
			done: false
		};
	}
}, Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]())));

Object.defineProperty(HeadersIteratorPrototype, Symbol.toStringTag, {
	value: 'HeadersIterator',
	writable: false,
	enumerable: false,
	configurable: true
});

/**
 * Export the Headers object in a form that Node.js can consume.
 *
 * @param   Headers  headers
 * @return  Object
 */
function exportNodeCompatibleHeaders(headers) {
	const obj = Object.assign({ __proto__: null }, headers[MAP]);

	// http.request() only supports string as Host header. This hack makes
	// specifying custom Host header possible.
	const hostHeaderKey = find(headers[MAP], 'Host');
	if (hostHeaderKey !== undefined) {
		obj[hostHeaderKey] = obj[hostHeaderKey][0];
	}

	return obj;
}

/**
 * Create a Headers object from an object of headers, ignoring those that do
 * not conform to HTTP grammar productions.
 *
 * @param   Object  obj  Object of headers
 * @return  Headers
 */
function createHeadersLenient(obj) {
	const headers = new Headers();
	for (const name of Object.keys(obj)) {
		if (invalidTokenRegex.test(name)) {
			continue;
		}
		if (Array.isArray(obj[name])) {
			for (const val of obj[name]) {
				if (invalidHeaderCharRegex.test(val)) {
					continue;
				}
				if (headers[MAP][name] === undefined) {
					headers[MAP][name] = [val];
				} else {
					headers[MAP][name].push(val);
				}
			}
		} else if (!invalidHeaderCharRegex.test(obj[name])) {
			headers[MAP][name] = [obj[name]];
		}
	}
	return headers;
}

const INTERNALS$1 = Symbol('Response internals');

// fix an issue where "STATUS_CODES" aren't a named export for node <10
const STATUS_CODES = http.STATUS_CODES;

/**
 * Response class
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
class Response {
	constructor() {
		let body = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
		let opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		Body.call(this, body, opts);

		const status = opts.status || 200;
		const headers = new Headers(opts.headers);

		if (body != null && !headers.has('Content-Type')) {
			const contentType = extractContentType(body);
			if (contentType) {
				headers.append('Content-Type', contentType);
			}
		}

		this[INTERNALS$1] = {
			url: opts.url,
			status,
			statusText: opts.statusText || STATUS_CODES[status],
			headers,
			counter: opts.counter
		};
	}

	get url() {
		return this[INTERNALS$1].url || '';
	}

	get status() {
		return this[INTERNALS$1].status;
	}

	/**
  * Convenience property representing if the request ended normally
  */
	get ok() {
		return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
	}

	get redirected() {
		return this[INTERNALS$1].counter > 0;
	}

	get statusText() {
		return this[INTERNALS$1].statusText;
	}

	get headers() {
		return this[INTERNALS$1].headers;
	}

	/**
  * Clone this response
  *
  * @return  Response
  */
	clone() {
		return new Response(clone(this), {
			url: this.url,
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
			ok: this.ok,
			redirected: this.redirected
		});
	}
}

Body.mixIn(Response.prototype);

Object.defineProperties(Response.prototype, {
	url: { enumerable: true },
	status: { enumerable: true },
	ok: { enumerable: true },
	redirected: { enumerable: true },
	statusText: { enumerable: true },
	headers: { enumerable: true },
	clone: { enumerable: true }
});

Object.defineProperty(Response.prototype, Symbol.toStringTag, {
	value: 'Response',
	writable: false,
	enumerable: false,
	configurable: true
});

const INTERNALS$2 = Symbol('Request internals');

// fix an issue where "format", "parse" aren't a named export for node <10
const parse_url = Url.parse;
const format_url = Url.format;

const streamDestructionSupported = 'destroy' in Stream.Readable.prototype;

/**
 * Check if a value is an instance of Request.
 *
 * @param   Mixed   input
 * @return  Boolean
 */
function isRequest(input) {
	return typeof input === 'object' && typeof input[INTERNALS$2] === 'object';
}

function isAbortSignal(signal) {
	const proto = signal && typeof signal === 'object' && Object.getPrototypeOf(signal);
	return !!(proto && proto.constructor.name === 'AbortSignal');
}

/**
 * Request class
 *
 * @param   Mixed   input  Url or Request instance
 * @param   Object  init   Custom options
 * @return  Void
 */
class Request {
	constructor(input) {
		let init = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		let parsedURL;

		// normalize input
		if (!isRequest(input)) {
			if (input && input.href) {
				// in order to support Node.js' Url objects; though WHATWG's URL objects
				// will fall into this branch also (since their `toString()` will return
				// `href` property anyway)
				parsedURL = parse_url(input.href);
			} else {
				// coerce input to a string before attempting to parse
				parsedURL = parse_url(`${input}`);
			}
			input = {};
		} else {
			parsedURL = parse_url(input.url);
		}

		let method = init.method || input.method || 'GET';
		method = method.toUpperCase();

		if ((init.body != null || isRequest(input) && input.body !== null) && (method === 'GET' || method === 'HEAD')) {
			throw new TypeError('Request with GET/HEAD method cannot have body');
		}

		let inputBody = init.body != null ? init.body : isRequest(input) && input.body !== null ? clone(input) : null;

		Body.call(this, inputBody, {
			timeout: init.timeout || input.timeout || 0,
			size: init.size || input.size || 0
		});

		const headers = new Headers(init.headers || input.headers || {});

		if (inputBody != null && !headers.has('Content-Type')) {
			const contentType = extractContentType(inputBody);
			if (contentType) {
				headers.append('Content-Type', contentType);
			}
		}

		let signal = isRequest(input) ? input.signal : null;
		if ('signal' in init) signal = init.signal;

		if (signal != null && !isAbortSignal(signal)) {
			throw new TypeError('Expected signal to be an instanceof AbortSignal');
		}

		this[INTERNALS$2] = {
			method,
			redirect: init.redirect || input.redirect || 'follow',
			headers,
			parsedURL,
			signal
		};

		// node-fetch-only options
		this.follow = init.follow !== undefined ? init.follow : input.follow !== undefined ? input.follow : 20;
		this.compress = init.compress !== undefined ? init.compress : input.compress !== undefined ? input.compress : true;
		this.counter = init.counter || input.counter || 0;
		this.agent = init.agent || input.agent;
	}

	get method() {
		return this[INTERNALS$2].method;
	}

	get url() {
		return format_url(this[INTERNALS$2].parsedURL);
	}

	get headers() {
		return this[INTERNALS$2].headers;
	}

	get redirect() {
		return this[INTERNALS$2].redirect;
	}

	get signal() {
		return this[INTERNALS$2].signal;
	}

	/**
  * Clone this request
  *
  * @return  Request
  */
	clone() {
		return new Request(this);
	}
}

Body.mixIn(Request.prototype);

Object.defineProperty(Request.prototype, Symbol.toStringTag, {
	value: 'Request',
	writable: false,
	enumerable: false,
	configurable: true
});

Object.defineProperties(Request.prototype, {
	method: { enumerable: true },
	url: { enumerable: true },
	headers: { enumerable: true },
	redirect: { enumerable: true },
	clone: { enumerable: true },
	signal: { enumerable: true }
});

/**
 * Convert a Request to Node.js http request options.
 *
 * @param   Request  A Request instance
 * @return  Object   The options object to be passed to http.request
 */
function getNodeRequestOptions(request) {
	const parsedURL = request[INTERNALS$2].parsedURL;
	const headers = new Headers(request[INTERNALS$2].headers);

	// fetch step 1.3
	if (!headers.has('Accept')) {
		headers.set('Accept', '*/*');
	}

	// Basic fetch
	if (!parsedURL.protocol || !parsedURL.hostname) {
		throw new TypeError('Only absolute URLs are supported');
	}

	if (!/^https?:$/.test(parsedURL.protocol)) {
		throw new TypeError('Only HTTP(S) protocols are supported');
	}

	if (request.signal && request.body instanceof Stream.Readable && !streamDestructionSupported) {
		throw new Error('Cancellation of streamed requests with AbortSignal is not supported in node < 8');
	}

	// HTTP-network-or-cache fetch steps 2.4-2.7
	let contentLengthValue = null;
	if (request.body == null && /^(POST|PUT)$/i.test(request.method)) {
		contentLengthValue = '0';
	}
	if (request.body != null) {
		const totalBytes = getTotalBytes(request);
		if (typeof totalBytes === 'number') {
			contentLengthValue = String(totalBytes);
		}
	}
	if (contentLengthValue) {
		headers.set('Content-Length', contentLengthValue);
	}

	// HTTP-network-or-cache fetch step 2.11
	if (!headers.has('User-Agent')) {
		headers.set('User-Agent', 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)');
	}

	// HTTP-network-or-cache fetch step 2.15
	if (request.compress && !headers.has('Accept-Encoding')) {
		headers.set('Accept-Encoding', 'gzip,deflate');
	}

	let agent = request.agent;
	if (typeof agent === 'function') {
		agent = agent(parsedURL);
	}

	if (!headers.has('Connection') && !agent) {
		headers.set('Connection', 'close');
	}

	// HTTP-network fetch step 4.2
	// chunked encoding is handled by Node.js

	return Object.assign({}, parsedURL, {
		method: request.method,
		headers: exportNodeCompatibleHeaders(headers),
		agent
	});
}

/**
 * abort-error.js
 *
 * AbortError interface for cancelled requests
 */

/**
 * Create AbortError instance
 *
 * @param   String      message      Error message for human
 * @return  AbortError
 */
function AbortError(message) {
  Error.call(this, message);

  this.type = 'aborted';
  this.message = message;

  // hide custom error implementation details from end-users
  Error.captureStackTrace(this, this.constructor);
}

AbortError.prototype = Object.create(Error.prototype);
AbortError.prototype.constructor = AbortError;
AbortError.prototype.name = 'AbortError';

// fix an issue where "PassThrough", "resolve" aren't a named export for node <10
const PassThrough$1 = Stream.PassThrough;
const resolve_url = Url.resolve;

/**
 * Fetch function
 *
 * @param   Mixed    url   Absolute url or Request instance
 * @param   Object   opts  Fetch options
 * @return  Promise
 */
function fetch(url, opts) {

	// allow custom promise
	if (!fetch.Promise) {
		throw new Error('native promise missing, set fetch.Promise to your favorite alternative');
	}

	Body.Promise = fetch.Promise;

	// wrap http.request into fetch
	return new fetch.Promise(function (resolve, reject) {
		// build request object
		const request = new Request(url, opts);
		const options = getNodeRequestOptions(request);

		const send = (options.protocol === 'https:' ? https : http).request;
		const signal = request.signal;

		let response = null;

		const abort = function abort() {
			let error = new AbortError('The user aborted a request.');
			reject(error);
			if (request.body && request.body instanceof Stream.Readable) {
				request.body.destroy(error);
			}
			if (!response || !response.body) return;
			response.body.emit('error', error);
		};

		if (signal && signal.aborted) {
			abort();
			return;
		}

		const abortAndFinalize = function abortAndFinalize() {
			abort();
			finalize();
		};

		// send request
		const req = send(options);
		let reqTimeout;

		if (signal) {
			signal.addEventListener('abort', abortAndFinalize);
		}

		function finalize() {
			req.abort();
			if (signal) signal.removeEventListener('abort', abortAndFinalize);
			clearTimeout(reqTimeout);
		}

		if (request.timeout) {
			req.once('socket', function (socket) {
				reqTimeout = setTimeout(function () {
					reject(new FetchError(`network timeout at: ${request.url}`, 'request-timeout'));
					finalize();
				}, request.timeout);
			});
		}

		req.on('error', function (err) {
			reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err));
			finalize();
		});

		req.on('response', function (res) {
			clearTimeout(reqTimeout);

			const headers = createHeadersLenient(res.headers);

			// HTTP fetch step 5
			if (fetch.isRedirect(res.statusCode)) {
				// HTTP fetch step 5.2
				const location = headers.get('Location');

				// HTTP fetch step 5.3
				const locationURL = location === null ? null : resolve_url(request.url, location);

				// HTTP fetch step 5.5
				switch (request.redirect) {
					case 'error':
						reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, 'no-redirect'));
						finalize();
						return;
					case 'manual':
						// node-fetch-specific step: make manual redirect a bit easier to use by setting the Location header value to the resolved URL.
						if (locationURL !== null) {
							// handle corrupted header
							try {
								headers.set('Location', locationURL);
							} catch (err) {
								// istanbul ignore next: nodejs server prevent invalid response headers, we can't test this through normal request
								reject(err);
							}
						}
						break;
					case 'follow':
						// HTTP-redirect fetch step 2
						if (locationURL === null) {
							break;
						}

						// HTTP-redirect fetch step 5
						if (request.counter >= request.follow) {
							reject(new FetchError(`maximum redirect reached at: ${request.url}`, 'max-redirect'));
							finalize();
							return;
						}

						// HTTP-redirect fetch step 6 (counter increment)
						// Create a new Request object.
						const requestOpts = {
							headers: new Headers(request.headers),
							follow: request.follow,
							counter: request.counter + 1,
							agent: request.agent,
							compress: request.compress,
							method: request.method,
							body: request.body,
							signal: request.signal,
							timeout: request.timeout,
							size: request.size
						};

						// HTTP-redirect fetch step 9
						if (res.statusCode !== 303 && request.body && getTotalBytes(request) === null) {
							reject(new FetchError('Cannot follow redirect with body being a readable stream', 'unsupported-redirect'));
							finalize();
							return;
						}

						// HTTP-redirect fetch step 11
						if (res.statusCode === 303 || (res.statusCode === 301 || res.statusCode === 302) && request.method === 'POST') {
							requestOpts.method = 'GET';
							requestOpts.body = undefined;
							requestOpts.headers.delete('content-length');
						}

						// HTTP-redirect fetch step 15
						resolve(fetch(new Request(locationURL, requestOpts)));
						finalize();
						return;
				}
			}

			// prepare response
			res.once('end', function () {
				if (signal) signal.removeEventListener('abort', abortAndFinalize);
			});
			let body = res.pipe(new PassThrough$1());

			const response_options = {
				url: request.url,
				status: res.statusCode,
				statusText: res.statusMessage,
				headers: headers,
				size: request.size,
				timeout: request.timeout,
				counter: request.counter
			};

			// HTTP-network fetch step 12.1.1.3
			const codings = headers.get('Content-Encoding');

			// HTTP-network fetch step 12.1.1.4: handle content codings

			// in following scenarios we ignore compression support
			// 1. compression support is disabled
			// 2. HEAD request
			// 3. no Content-Encoding header
			// 4. no content response (204)
			// 5. content not modified response (304)
			if (!request.compress || request.method === 'HEAD' || codings === null || res.statusCode === 204 || res.statusCode === 304) {
				response = new Response(body, response_options);
				resolve(response);
				return;
			}

			// For Node v6+
			// Be less strict when decoding compressed responses, since sometimes
			// servers send slightly invalid responses that are still accepted
			// by common browsers.
			// Always using Z_SYNC_FLUSH is what cURL does.
			const zlibOptions = {
				flush: zlib.Z_SYNC_FLUSH,
				finishFlush: zlib.Z_SYNC_FLUSH
			};

			// for gzip
			if (codings == 'gzip' || codings == 'x-gzip') {
				body = body.pipe(zlib.createGunzip(zlibOptions));
				response = new Response(body, response_options);
				resolve(response);
				return;
			}

			// for deflate
			if (codings == 'deflate' || codings == 'x-deflate') {
				// handle the infamous raw deflate response from old servers
				// a hack for old IIS and Apache servers
				const raw = res.pipe(new PassThrough$1());
				raw.once('data', function (chunk) {
					// see http://stackoverflow.com/questions/37519828
					if ((chunk[0] & 0x0F) === 0x08) {
						body = body.pipe(zlib.createInflate());
					} else {
						body = body.pipe(zlib.createInflateRaw());
					}
					response = new Response(body, response_options);
					resolve(response);
				});
				return;
			}

			// for br
			if (codings == 'br' && typeof zlib.createBrotliDecompress === 'function') {
				body = body.pipe(zlib.createBrotliDecompress());
				response = new Response(body, response_options);
				resolve(response);
				return;
			}

			// otherwise, use response as-is
			response = new Response(body, response_options);
			resolve(response);
		});

		writeToStream(req, request);
	});
}
/**
 * Redirect code matching
 *
 * @param   Number   code  Status code
 * @return  Boolean
 */
fetch.isRedirect = function (code) {
	return code === 301 || code === 302 || code === 303 || code === 307 || code === 308;
};

// expose Promise
fetch.Promise = global.Promise;

module.exports = exports = fetch;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports;
exports.Headers = Headers;
exports.Request = Request;
exports.Response = Response;
exports.FetchError = FetchError;


/***/ }),

/***/ 507:
/***/ (function(__unusedmodule, exports) {

exports.entityMap = {
       lt: '<',
       gt: '>',
       amp: '&',
       quot: '"',
       apos: "'",
       Agrave: "À",
       Aacute: "Á",
       Acirc: "Â",
       Atilde: "Ã",
       Auml: "Ä",
       Aring: "Å",
       AElig: "Æ",
       Ccedil: "Ç",
       Egrave: "È",
       Eacute: "É",
       Ecirc: "Ê",
       Euml: "Ë",
       Igrave: "Ì",
       Iacute: "Í",
       Icirc: "Î",
       Iuml: "Ï",
       ETH: "Ð",
       Ntilde: "Ñ",
       Ograve: "Ò",
       Oacute: "Ó",
       Ocirc: "Ô",
       Otilde: "Õ",
       Ouml: "Ö",
       Oslash: "Ø",
       Ugrave: "Ù",
       Uacute: "Ú",
       Ucirc: "Û",
       Uuml: "Ü",
       Yacute: "Ý",
       THORN: "Þ",
       szlig: "ß",
       agrave: "à",
       aacute: "á",
       acirc: "â",
       atilde: "ã",
       auml: "ä",
       aring: "å",
       aelig: "æ",
       ccedil: "ç",
       egrave: "è",
       eacute: "é",
       ecirc: "ê",
       euml: "ë",
       igrave: "ì",
       iacute: "í",
       icirc: "î",
       iuml: "ï",
       eth: "ð",
       ntilde: "ñ",
       ograve: "ò",
       oacute: "ó",
       ocirc: "ô",
       otilde: "õ",
       ouml: "ö",
       oslash: "ø",
       ugrave: "ù",
       uacute: "ú",
       ucirc: "û",
       uuml: "ü",
       yacute: "ý",
       thorn: "þ",
       yuml: "ÿ",
       nbsp: "\u00a0",
       iexcl: "¡",
       cent: "¢",
       pound: "£",
       curren: "¤",
       yen: "¥",
       brvbar: "¦",
       sect: "§",
       uml: "¨",
       copy: "©",
       ordf: "ª",
       laquo: "«",
       not: "¬",
       shy: "­­",
       reg: "®",
       macr: "¯",
       deg: "°",
       plusmn: "±",
       sup2: "²",
       sup3: "³",
       acute: "´",
       micro: "µ",
       para: "¶",
       middot: "·",
       cedil: "¸",
       sup1: "¹",
       ordm: "º",
       raquo: "»",
       frac14: "¼",
       frac12: "½",
       frac34: "¾",
       iquest: "¿",
       times: "×",
       divide: "÷",
       forall: "∀",
       part: "∂",
       exist: "∃",
       empty: "∅",
       nabla: "∇",
       isin: "∈",
       notin: "∉",
       ni: "∋",
       prod: "∏",
       sum: "∑",
       minus: "−",
       lowast: "∗",
       radic: "√",
       prop: "∝",
       infin: "∞",
       ang: "∠",
       and: "∧",
       or: "∨",
       cap: "∩",
       cup: "∪",
       'int': "∫",
       there4: "∴",
       sim: "∼",
       cong: "≅",
       asymp: "≈",
       ne: "≠",
       equiv: "≡",
       le: "≤",
       ge: "≥",
       sub: "⊂",
       sup: "⊃",
       nsub: "⊄",
       sube: "⊆",
       supe: "⊇",
       oplus: "⊕",
       otimes: "⊗",
       perp: "⊥",
       sdot: "⋅",
       Alpha: "Α",
       Beta: "Β",
       Gamma: "Γ",
       Delta: "Δ",
       Epsilon: "Ε",
       Zeta: "Ζ",
       Eta: "Η",
       Theta: "Θ",
       Iota: "Ι",
       Kappa: "Κ",
       Lambda: "Λ",
       Mu: "Μ",
       Nu: "Ν",
       Xi: "Ξ",
       Omicron: "Ο",
       Pi: "Π",
       Rho: "Ρ",
       Sigma: "Σ",
       Tau: "Τ",
       Upsilon: "Υ",
       Phi: "Φ",
       Chi: "Χ",
       Psi: "Ψ",
       Omega: "Ω",
       alpha: "α",
       beta: "β",
       gamma: "γ",
       delta: "δ",
       epsilon: "ε",
       zeta: "ζ",
       eta: "η",
       theta: "θ",
       iota: "ι",
       kappa: "κ",
       lambda: "λ",
       mu: "μ",
       nu: "ν",
       xi: "ξ",
       omicron: "ο",
       pi: "π",
       rho: "ρ",
       sigmaf: "ς",
       sigma: "σ",
       tau: "τ",
       upsilon: "υ",
       phi: "φ",
       chi: "χ",
       psi: "ψ",
       omega: "ω",
       thetasym: "ϑ",
       upsih: "ϒ",
       piv: "ϖ",
       OElig: "Œ",
       oelig: "œ",
       Scaron: "Š",
       scaron: "š",
       Yuml: "Ÿ",
       fnof: "ƒ",
       circ: "ˆ",
       tilde: "˜",
       ensp: " ",
       emsp: " ",
       thinsp: " ",
       zwnj: "‌",
       zwj: "‍",
       lrm: "‎",
       rlm: "‏",
       ndash: "–",
       mdash: "—",
       lsquo: "‘",
       rsquo: "’",
       sbquo: "‚",
       ldquo: "“",
       rdquo: "”",
       bdquo: "„",
       dagger: "†",
       Dagger: "‡",
       bull: "•",
       hellip: "…",
       permil: "‰",
       prime: "′",
       Prime: "″",
       lsaquo: "‹",
       rsaquo: "›",
       oline: "‾",
       euro: "€",
       trade: "™",
       larr: "←",
       uarr: "↑",
       rarr: "→",
       darr: "↓",
       harr: "↔",
       crarr: "↵",
       lceil: "⌈",
       rceil: "⌉",
       lfloor: "⌊",
       rfloor: "⌋",
       loz: "◊",
       spades: "♠",
       clubs: "♣",
       hearts: "♥",
       diams: "♦"
};


/***/ }),

/***/ 516:
/***/ (function(module) {

"use strict";


/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }

  error.request = request;
  error.response = response;
  error.isAxiosError = true;

  error.toJSON = function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    };
  };
  return error;
};


/***/ }),

/***/ 528:
/***/ (function(module) {

"use strict";

module.exports = str => encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);


/***/ }),

/***/ 545:
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = __webpack_require__(618);

/***/ }),

/***/ 555:
/***/ (function(__unusedmodule, exports) {

function copy(src,dest){
	for(var p in src){
		dest[p] = src[p];
	}
}
/**
^\w+\.prototype\.([_\w]+)\s*=\s*((?:.*\{\s*?[\r\n][\s\S]*?^})|\S.*?(?=[;\r\n]));?
^\w+\.prototype\.([_\w]+)\s*=\s*(\S.*?(?=[;\r\n]));?
 */
function _extends(Class,Super){
	var pt = Class.prototype;
	if(!(pt instanceof Super)){
		function t(){};
		t.prototype = Super.prototype;
		t = new t();
		copy(pt,t);
		Class.prototype = pt = t;
	}
	if(pt.constructor != Class){
		if(typeof Class != 'function'){
			console.error("unknow Class:"+Class)
		}
		pt.constructor = Class
	}
}
var htmlns = 'http://www.w3.org/1999/xhtml' ;
// Node Types
var NodeType = {}
var ELEMENT_NODE                = NodeType.ELEMENT_NODE                = 1;
var ATTRIBUTE_NODE              = NodeType.ATTRIBUTE_NODE              = 2;
var TEXT_NODE                   = NodeType.TEXT_NODE                   = 3;
var CDATA_SECTION_NODE          = NodeType.CDATA_SECTION_NODE          = 4;
var ENTITY_REFERENCE_NODE       = NodeType.ENTITY_REFERENCE_NODE       = 5;
var ENTITY_NODE                 = NodeType.ENTITY_NODE                 = 6;
var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
var COMMENT_NODE                = NodeType.COMMENT_NODE                = 8;
var DOCUMENT_NODE               = NodeType.DOCUMENT_NODE               = 9;
var DOCUMENT_TYPE_NODE          = NodeType.DOCUMENT_TYPE_NODE          = 10;
var DOCUMENT_FRAGMENT_NODE      = NodeType.DOCUMENT_FRAGMENT_NODE      = 11;
var NOTATION_NODE               = NodeType.NOTATION_NODE               = 12;

// ExceptionCode
var ExceptionCode = {}
var ExceptionMessage = {};
var INDEX_SIZE_ERR              = ExceptionCode.INDEX_SIZE_ERR              = ((ExceptionMessage[1]="Index size error"),1);
var DOMSTRING_SIZE_ERR          = ExceptionCode.DOMSTRING_SIZE_ERR          = ((ExceptionMessage[2]="DOMString size error"),2);
var HIERARCHY_REQUEST_ERR       = ExceptionCode.HIERARCHY_REQUEST_ERR       = ((ExceptionMessage[3]="Hierarchy request error"),3);
var WRONG_DOCUMENT_ERR          = ExceptionCode.WRONG_DOCUMENT_ERR          = ((ExceptionMessage[4]="Wrong document"),4);
var INVALID_CHARACTER_ERR       = ExceptionCode.INVALID_CHARACTER_ERR       = ((ExceptionMessage[5]="Invalid character"),5);
var NO_DATA_ALLOWED_ERR         = ExceptionCode.NO_DATA_ALLOWED_ERR         = ((ExceptionMessage[6]="No data allowed"),6);
var NO_MODIFICATION_ALLOWED_ERR = ExceptionCode.NO_MODIFICATION_ALLOWED_ERR = ((ExceptionMessage[7]="No modification allowed"),7);
var NOT_FOUND_ERR               = ExceptionCode.NOT_FOUND_ERR               = ((ExceptionMessage[8]="Not found"),8);
var NOT_SUPPORTED_ERR           = ExceptionCode.NOT_SUPPORTED_ERR           = ((ExceptionMessage[9]="Not supported"),9);
var INUSE_ATTRIBUTE_ERR         = ExceptionCode.INUSE_ATTRIBUTE_ERR         = ((ExceptionMessage[10]="Attribute in use"),10);
//level2
var INVALID_STATE_ERR        	= ExceptionCode.INVALID_STATE_ERR        	= ((ExceptionMessage[11]="Invalid state"),11);
var SYNTAX_ERR               	= ExceptionCode.SYNTAX_ERR               	= ((ExceptionMessage[12]="Syntax error"),12);
var INVALID_MODIFICATION_ERR 	= ExceptionCode.INVALID_MODIFICATION_ERR 	= ((ExceptionMessage[13]="Invalid modification"),13);
var NAMESPACE_ERR            	= ExceptionCode.NAMESPACE_ERR           	= ((ExceptionMessage[14]="Invalid namespace"),14);
var INVALID_ACCESS_ERR       	= ExceptionCode.INVALID_ACCESS_ERR      	= ((ExceptionMessage[15]="Invalid access"),15);

/**
 * DOM Level 2
 * Object DOMException
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/ecma-script-binding.html
 * @see http://www.w3.org/TR/REC-DOM-Level-1/ecma-script-language-binding.html
 */
function DOMException(code, message) {
	if(message instanceof Error){
		var error = message;
	}else{
		error = this;
		Error.call(this, ExceptionMessage[code]);
		this.message = ExceptionMessage[code];
		if(Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
	}
	error.code = code;
	if(message) this.message = this.message + ": " + message;
	return error;
};
DOMException.prototype = Error.prototype;
copy(ExceptionCode,DOMException)
/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-536297177
 * The NodeList interface provides the abstraction of an ordered collection of nodes, without defining or constraining how this collection is implemented. NodeList objects in the DOM are live.
 * The items in the NodeList are accessible via an integral index, starting from 0.
 */
function NodeList() {
};
NodeList.prototype = {
	/**
	 * The number of nodes in the list. The range of valid child node indices is 0 to length-1 inclusive.
	 * @standard level1
	 */
	length:0, 
	/**
	 * Returns the indexth item in the collection. If index is greater than or equal to the number of nodes in the list, this returns null.
	 * @standard level1
	 * @param index  unsigned long 
	 *   Index into the collection.
	 * @return Node
	 * 	The node at the indexth position in the NodeList, or null if that is not a valid index. 
	 */
	item: function(index) {
		return this[index] || null;
	},
	toString:function(isHTML,nodeFilter){
		for(var buf = [], i = 0;i<this.length;i++){
			serializeToString(this[i],buf,isHTML,nodeFilter);
		}
		return buf.join('');
	}
};
function LiveNodeList(node,refresh){
	this._node = node;
	this._refresh = refresh
	_updateLiveList(this);
}
function _updateLiveList(list){
	var inc = list._node._inc || list._node.ownerDocument._inc;
	if(list._inc != inc){
		var ls = list._refresh(list._node);
		//console.log(ls.length)
		__set__(list,'length',ls.length);
		copy(ls,list);
		list._inc = inc;
	}
}
LiveNodeList.prototype.item = function(i){
	_updateLiveList(this);
	return this[i];
}

_extends(LiveNodeList,NodeList);
/**
 * 
 * Objects implementing the NamedNodeMap interface are used to represent collections of nodes that can be accessed by name. Note that NamedNodeMap does not inherit from NodeList; NamedNodeMaps are not maintained in any particular order. Objects contained in an object implementing NamedNodeMap may also be accessed by an ordinal index, but this is simply to allow convenient enumeration of the contents of a NamedNodeMap, and does not imply that the DOM specifies an order to these Nodes.
 * NamedNodeMap objects in the DOM are live.
 * used for attributes or DocumentType entities 
 */
function NamedNodeMap() {
};

function _findNodeIndex(list,node){
	var i = list.length;
	while(i--){
		if(list[i] === node){return i}
	}
}

function _addNamedNode(el,list,newAttr,oldAttr){
	if(oldAttr){
		list[_findNodeIndex(list,oldAttr)] = newAttr;
	}else{
		list[list.length++] = newAttr;
	}
	if(el){
		newAttr.ownerElement = el;
		var doc = el.ownerDocument;
		if(doc){
			oldAttr && _onRemoveAttribute(doc,el,oldAttr);
			_onAddAttribute(doc,el,newAttr);
		}
	}
}
function _removeNamedNode(el,list,attr){
	//console.log('remove attr:'+attr)
	var i = _findNodeIndex(list,attr);
	if(i>=0){
		var lastIndex = list.length-1
		while(i<lastIndex){
			list[i] = list[++i]
		}
		list.length = lastIndex;
		if(el){
			var doc = el.ownerDocument;
			if(doc){
				_onRemoveAttribute(doc,el,attr);
				attr.ownerElement = null;
			}
		}
	}else{
		throw DOMException(NOT_FOUND_ERR,new Error(el.tagName+'@'+attr))
	}
}
NamedNodeMap.prototype = {
	length:0,
	item:NodeList.prototype.item,
	getNamedItem: function(key) {
//		if(key.indexOf(':')>0 || key == 'xmlns'){
//			return null;
//		}
		//console.log()
		var i = this.length;
		while(i--){
			var attr = this[i];
			//console.log(attr.nodeName,key)
			if(attr.nodeName == key){
				return attr;
			}
		}
	},
	setNamedItem: function(attr) {
		var el = attr.ownerElement;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		var oldAttr = this.getNamedItem(attr.nodeName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},
	/* returns Node */
	setNamedItemNS: function(attr) {// raises: WRONG_DOCUMENT_ERR,NO_MODIFICATION_ALLOWED_ERR,INUSE_ATTRIBUTE_ERR
		var el = attr.ownerElement, oldAttr;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		oldAttr = this.getNamedItemNS(attr.namespaceURI,attr.localName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},

	/* returns Node */
	removeNamedItem: function(key) {
		var attr = this.getNamedItem(key);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
		
		
	},// raises: NOT_FOUND_ERR,NO_MODIFICATION_ALLOWED_ERR
	
	//for level2
	removeNamedItemNS:function(namespaceURI,localName){
		var attr = this.getNamedItemNS(namespaceURI,localName);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
	},
	getNamedItemNS: function(namespaceURI, localName) {
		var i = this.length;
		while(i--){
			var node = this[i];
			if(node.localName == localName && node.namespaceURI == namespaceURI){
				return node;
			}
		}
		return null;
	}
};
/**
 * @see http://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-102161490
 */
function DOMImplementation(/* Object */ features) {
	this._features = {};
	if (features) {
		for (var feature in features) {
			 this._features = features[feature];
		}
	}
};

DOMImplementation.prototype = {
	hasFeature: function(/* string */ feature, /* string */ version) {
		var versions = this._features[feature.toLowerCase()];
		if (versions && (!version || version in versions)) {
			return true;
		} else {
			return false;
		}
	},
	// Introduced in DOM Level 2:
	createDocument:function(namespaceURI,  qualifiedName, doctype){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR,WRONG_DOCUMENT_ERR
		var doc = new Document();
		doc.implementation = this;
		doc.childNodes = new NodeList();
		doc.doctype = doctype;
		if(doctype){
			doc.appendChild(doctype);
		}
		if(qualifiedName){
			var root = doc.createElementNS(namespaceURI,qualifiedName);
			doc.appendChild(root);
		}
		return doc;
	},
	// Introduced in DOM Level 2:
	createDocumentType:function(qualifiedName, publicId, systemId){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR
		var node = new DocumentType();
		node.name = qualifiedName;
		node.nodeName = qualifiedName;
		node.publicId = publicId;
		node.systemId = systemId;
		// Introduced in DOM Level 2:
		//readonly attribute DOMString        internalSubset;
		
		//TODO:..
		//  readonly attribute NamedNodeMap     entities;
		//  readonly attribute NamedNodeMap     notations;
		return node;
	}
};


/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247
 */

function Node() {
};

Node.prototype = {
	firstChild : null,
	lastChild : null,
	previousSibling : null,
	nextSibling : null,
	attributes : null,
	parentNode : null,
	childNodes : null,
	ownerDocument : null,
	nodeValue : null,
	namespaceURI : null,
	prefix : null,
	localName : null,
	// Modified in DOM Level 2:
	insertBefore:function(newChild, refChild){//raises 
		return _insertBefore(this,newChild,refChild);
	},
	replaceChild:function(newChild, oldChild){//raises 
		this.insertBefore(newChild,oldChild);
		if(oldChild){
			this.removeChild(oldChild);
		}
	},
	removeChild:function(oldChild){
		return _removeChild(this,oldChild);
	},
	appendChild:function(newChild){
		return this.insertBefore(newChild,null);
	},
	hasChildNodes:function(){
		return this.firstChild != null;
	},
	cloneNode:function(deep){
		return cloneNode(this.ownerDocument||this,this,deep);
	},
	// Modified in DOM Level 2:
	normalize:function(){
		var child = this.firstChild;
		while(child){
			var next = child.nextSibling;
			if(next && next.nodeType == TEXT_NODE && child.nodeType == TEXT_NODE){
				this.removeChild(next);
				child.appendData(next.data);
			}else{
				child.normalize();
				child = next;
			}
		}
	},
  	// Introduced in DOM Level 2:
	isSupported:function(feature, version){
		return this.ownerDocument.implementation.hasFeature(feature,version);
	},
    // Introduced in DOM Level 2:
    hasAttributes:function(){
    	return this.attributes.length>0;
    },
    lookupPrefix:function(namespaceURI){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			for(var n in map){
    				if(map[n] == namespaceURI){
    					return n;
    				}
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    lookupNamespaceURI:function(prefix){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			if(prefix in map){
    				return map[prefix] ;
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    isDefaultNamespace:function(namespaceURI){
    	var prefix = this.lookupPrefix(namespaceURI);
    	return prefix == null;
    }
};


function _xmlEncoder(c){
	return c == '<' && '&lt;' ||
         c == '>' && '&gt;' ||
         c == '&' && '&amp;' ||
         c == '"' && '&quot;' ||
         '&#'+c.charCodeAt()+';'
}


copy(NodeType,Node);
copy(NodeType,Node.prototype);

/**
 * @param callback return true for continue,false for break
 * @return boolean true: break visit;
 */
function _visitNode(node,callback){
	if(callback(node)){
		return true;
	}
	if(node = node.firstChild){
		do{
			if(_visitNode(node,callback)){return true}
        }while(node=node.nextSibling)
    }
}



function Document(){
}
function _onAddAttribute(doc,el,newAttr){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		el._nsMap[newAttr.prefix?newAttr.localName:''] = newAttr.value
	}
}
function _onRemoveAttribute(doc,el,newAttr,remove){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		delete el._nsMap[newAttr.prefix?newAttr.localName:'']
	}
}
function _onUpdateChild(doc,el,newChild){
	if(doc && doc._inc){
		doc._inc++;
		//update childNodes
		var cs = el.childNodes;
		if(newChild){
			cs[cs.length++] = newChild;
		}else{
			//console.log(1)
			var child = el.firstChild;
			var i = 0;
			while(child){
				cs[i++] = child;
				child =child.nextSibling;
			}
			cs.length = i;
		}
	}
}

/**
 * attributes;
 * children;
 * 
 * writeable properties:
 * nodeValue,Attr:value,CharacterData:data
 * prefix
 */
function _removeChild(parentNode,child){
	var previous = child.previousSibling;
	var next = child.nextSibling;
	if(previous){
		previous.nextSibling = next;
	}else{
		parentNode.firstChild = next
	}
	if(next){
		next.previousSibling = previous;
	}else{
		parentNode.lastChild = previous;
	}
	_onUpdateChild(parentNode.ownerDocument,parentNode);
	return child;
}
/**
 * preformance key(refChild == null)
 */
function _insertBefore(parentNode,newChild,nextChild){
	var cp = newChild.parentNode;
	if(cp){
		cp.removeChild(newChild);//remove and update
	}
	if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
		var newFirst = newChild.firstChild;
		if (newFirst == null) {
			return newChild;
		}
		var newLast = newChild.lastChild;
	}else{
		newFirst = newLast = newChild;
	}
	var pre = nextChild ? nextChild.previousSibling : parentNode.lastChild;

	newFirst.previousSibling = pre;
	newLast.nextSibling = nextChild;
	
	
	if(pre){
		pre.nextSibling = newFirst;
	}else{
		parentNode.firstChild = newFirst;
	}
	if(nextChild == null){
		parentNode.lastChild = newLast;
	}else{
		nextChild.previousSibling = newLast;
	}
	do{
		newFirst.parentNode = parentNode;
	}while(newFirst !== newLast && (newFirst= newFirst.nextSibling))
	_onUpdateChild(parentNode.ownerDocument||parentNode,parentNode);
	//console.log(parentNode.lastChild.nextSibling == null)
	if (newChild.nodeType == DOCUMENT_FRAGMENT_NODE) {
		newChild.firstChild = newChild.lastChild = null;
	}
	return newChild;
}
function _appendSingleChild(parentNode,newChild){
	var cp = newChild.parentNode;
	if(cp){
		var pre = parentNode.lastChild;
		cp.removeChild(newChild);//remove and update
		var pre = parentNode.lastChild;
	}
	var pre = parentNode.lastChild;
	newChild.parentNode = parentNode;
	newChild.previousSibling = pre;
	newChild.nextSibling = null;
	if(pre){
		pre.nextSibling = newChild;
	}else{
		parentNode.firstChild = newChild;
	}
	parentNode.lastChild = newChild;
	_onUpdateChild(parentNode.ownerDocument,parentNode,newChild);
	return newChild;
	//console.log("__aa",parentNode.lastChild.nextSibling == null)
}
Document.prototype = {
	//implementation : null,
	nodeName :  '#document',
	nodeType :  DOCUMENT_NODE,
	doctype :  null,
	documentElement :  null,
	_inc : 1,
	
	insertBefore :  function(newChild, refChild){//raises 
		if(newChild.nodeType == DOCUMENT_FRAGMENT_NODE){
			var child = newChild.firstChild;
			while(child){
				var next = child.nextSibling;
				this.insertBefore(child,refChild);
				child = next;
			}
			return newChild;
		}
		if(this.documentElement == null && newChild.nodeType == ELEMENT_NODE){
			this.documentElement = newChild;
		}
		
		return _insertBefore(this,newChild,refChild),(newChild.ownerDocument = this),newChild;
	},
	removeChild :  function(oldChild){
		if(this.documentElement == oldChild){
			this.documentElement = null;
		}
		return _removeChild(this,oldChild);
	},
	// Introduced in DOM Level 2:
	importNode : function(importedNode,deep){
		return importNode(this,importedNode,deep);
	},
	// Introduced in DOM Level 2:
	getElementById :	function(id){
		var rtv = null;
		_visitNode(this.documentElement,function(node){
			if(node.nodeType == ELEMENT_NODE){
				if(node.getAttribute('id') == id){
					rtv = node;
					return true;
				}
			}
		})
		return rtv;
	},
	
	getElementsByClassName: function(className) {
		var pattern = new RegExp("(^|\\s)" + className + "(\\s|$)");
		return new LiveNodeList(this, function(base) {
			var ls = [];
			_visitNode(base.documentElement, function(node) {
				if(node !== base && node.nodeType == ELEMENT_NODE) {
					if(pattern.test(node.getAttribute('class'))) {
						ls.push(node);
					}
				}
			});
			return ls;
		});
	},
	
	//document factory method:
	createElement :	function(tagName){
		var node = new Element();
		node.ownerDocument = this;
		node.nodeName = tagName;
		node.tagName = tagName;
		node.childNodes = new NodeList();
		var attrs	= node.attributes = new NamedNodeMap();
		attrs._ownerElement = node;
		return node;
	},
	createDocumentFragment :	function(){
		var node = new DocumentFragment();
		node.ownerDocument = this;
		node.childNodes = new NodeList();
		return node;
	},
	createTextNode :	function(data){
		var node = new Text();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createComment :	function(data){
		var node = new Comment();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createCDATASection :	function(data){
		var node = new CDATASection();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createProcessingInstruction :	function(target,data){
		var node = new ProcessingInstruction();
		node.ownerDocument = this;
		node.tagName = node.target = target;
		node.nodeValue= node.data = data;
		return node;
	},
	createAttribute :	function(name){
		var node = new Attr();
		node.ownerDocument	= this;
		node.name = name;
		node.nodeName	= name;
		node.localName = name;
		node.specified = true;
		return node;
	},
	createEntityReference :	function(name){
		var node = new EntityReference();
		node.ownerDocument	= this;
		node.nodeName	= name;
		return node;
	},
	// Introduced in DOM Level 2:
	createElementNS :	function(namespaceURI,qualifiedName){
		var node = new Element();
		var pl = qualifiedName.split(':');
		var attrs	= node.attributes = new NamedNodeMap();
		node.childNodes = new NodeList();
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.tagName = qualifiedName;
		node.namespaceURI = namespaceURI;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		attrs._ownerElement = node;
		return node;
	},
	// Introduced in DOM Level 2:
	createAttributeNS :	function(namespaceURI,qualifiedName){
		var node = new Attr();
		var pl = qualifiedName.split(':');
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.name = qualifiedName;
		node.namespaceURI = namespaceURI;
		node.specified = true;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		return node;
	}
};
_extends(Document,Node);


function Element() {
	this._nsMap = {};
};
Element.prototype = {
	nodeType : ELEMENT_NODE,
	hasAttribute : function(name){
		return this.getAttributeNode(name)!=null;
	},
	getAttribute : function(name){
		var attr = this.getAttributeNode(name);
		return attr && attr.value || '';
	},
	getAttributeNode : function(name){
		return this.attributes.getNamedItem(name);
	},
	setAttribute : function(name, value){
		var attr = this.ownerDocument.createAttribute(name);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	removeAttribute : function(name){
		var attr = this.getAttributeNode(name)
		attr && this.removeAttributeNode(attr);
	},
	
	//four real opeartion method
	appendChild:function(newChild){
		if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
			return this.insertBefore(newChild,null);
		}else{
			return _appendSingleChild(this,newChild);
		}
	},
	setAttributeNode : function(newAttr){
		return this.attributes.setNamedItem(newAttr);
	},
	setAttributeNodeNS : function(newAttr){
		return this.attributes.setNamedItemNS(newAttr);
	},
	removeAttributeNode : function(oldAttr){
		//console.log(this == oldAttr.ownerElement)
		return this.attributes.removeNamedItem(oldAttr.nodeName);
	},
	//get real attribute name,and remove it by removeAttributeNode
	removeAttributeNS : function(namespaceURI, localName){
		var old = this.getAttributeNodeNS(namespaceURI, localName);
		old && this.removeAttributeNode(old);
	},
	
	hasAttributeNS : function(namespaceURI, localName){
		return this.getAttributeNodeNS(namespaceURI, localName)!=null;
	},
	getAttributeNS : function(namespaceURI, localName){
		var attr = this.getAttributeNodeNS(namespaceURI, localName);
		return attr && attr.value || '';
	},
	setAttributeNS : function(namespaceURI, qualifiedName, value){
		var attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	getAttributeNodeNS : function(namespaceURI, localName){
		return this.attributes.getNamedItemNS(namespaceURI, localName);
	},
	
	getElementsByTagName : function(tagName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType == ELEMENT_NODE && (tagName === '*' || node.tagName == tagName)){
					ls.push(node);
				}
			});
			return ls;
		});
	},
	getElementsByTagNameNS : function(namespaceURI, localName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === '*' || node.namespaceURI === namespaceURI) && (localName === '*' || node.localName == localName)){
					ls.push(node);
				}
			});
			return ls;
			
		});
	}
};
Document.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
Document.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;


_extends(Element,Node);
function Attr() {
};
Attr.prototype.nodeType = ATTRIBUTE_NODE;
_extends(Attr,Node);


function CharacterData() {
};
CharacterData.prototype = {
	data : '',
	substringData : function(offset, count) {
		return this.data.substring(offset, offset+count);
	},
	appendData: function(text) {
		text = this.data+text;
		this.nodeValue = this.data = text;
		this.length = text.length;
	},
	insertData: function(offset,text) {
		this.replaceData(offset,0,text);
	
	},
	appendChild:function(newChild){
		throw new Error(ExceptionMessage[HIERARCHY_REQUEST_ERR])
	},
	deleteData: function(offset, count) {
		this.replaceData(offset,count,"");
	},
	replaceData: function(offset, count, text) {
		var start = this.data.substring(0,offset);
		var end = this.data.substring(offset+count);
		text = start + text + end;
		this.nodeValue = this.data = text;
		this.length = text.length;
	}
}
_extends(CharacterData,Node);
function Text() {
};
Text.prototype = {
	nodeName : "#text",
	nodeType : TEXT_NODE,
	splitText : function(offset) {
		var text = this.data;
		var newText = text.substring(offset);
		text = text.substring(0, offset);
		this.data = this.nodeValue = text;
		this.length = text.length;
		var newNode = this.ownerDocument.createTextNode(newText);
		if(this.parentNode){
			this.parentNode.insertBefore(newNode, this.nextSibling);
		}
		return newNode;
	}
}
_extends(Text,CharacterData);
function Comment() {
};
Comment.prototype = {
	nodeName : "#comment",
	nodeType : COMMENT_NODE
}
_extends(Comment,CharacterData);

function CDATASection() {
};
CDATASection.prototype = {
	nodeName : "#cdata-section",
	nodeType : CDATA_SECTION_NODE
}
_extends(CDATASection,CharacterData);


function DocumentType() {
};
DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
_extends(DocumentType,Node);

function Notation() {
};
Notation.prototype.nodeType = NOTATION_NODE;
_extends(Notation,Node);

function Entity() {
};
Entity.prototype.nodeType = ENTITY_NODE;
_extends(Entity,Node);

function EntityReference() {
};
EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
_extends(EntityReference,Node);

function DocumentFragment() {
};
DocumentFragment.prototype.nodeName =	"#document-fragment";
DocumentFragment.prototype.nodeType =	DOCUMENT_FRAGMENT_NODE;
_extends(DocumentFragment,Node);


function ProcessingInstruction() {
}
ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
_extends(ProcessingInstruction,Node);
function XMLSerializer(){}
XMLSerializer.prototype.serializeToString = function(node,isHtml,nodeFilter){
	return nodeSerializeToString.call(node,isHtml,nodeFilter);
}
Node.prototype.toString = nodeSerializeToString;
function nodeSerializeToString(isHtml,nodeFilter){
	var buf = [];
	var refNode = this.nodeType == 9 && this.documentElement || this;
	var prefix = refNode.prefix;
	var uri = refNode.namespaceURI;
	
	if(uri && prefix == null){
		//console.log(prefix)
		var prefix = refNode.lookupPrefix(uri);
		if(prefix == null){
			//isHTML = true;
			var visibleNamespaces=[
			{namespace:uri,prefix:null}
			//{namespace:uri,prefix:''}
			]
		}
	}
	serializeToString(this,buf,isHtml,nodeFilter,visibleNamespaces);
	//console.log('###',this.nodeType,uri,prefix,buf.join(''))
	return buf.join('');
}
function needNamespaceDefine(node,isHTML, visibleNamespaces) {
	var prefix = node.prefix||'';
	var uri = node.namespaceURI;
	if (!prefix && !uri){
		return false;
	}
	if (prefix === "xml" && uri === "http://www.w3.org/XML/1998/namespace" 
		|| uri == 'http://www.w3.org/2000/xmlns/'){
		return false;
	}
	
	var i = visibleNamespaces.length 
	//console.log('@@@@',node.tagName,prefix,uri,visibleNamespaces)
	while (i--) {
		var ns = visibleNamespaces[i];
		// get namespace prefix
		//console.log(node.nodeType,node.tagName,ns.prefix,prefix)
		if (ns.prefix == prefix){
			return ns.namespace != uri;
		}
	}
	//console.log(isHTML,uri,prefix=='')
	//if(isHTML && prefix ==null && uri == 'http://www.w3.org/1999/xhtml'){
	//	return false;
	//}
	//node.flag = '11111'
	//console.error(3,true,node.flag,node.prefix,node.namespaceURI)
	return true;
}
function serializeToString(node,buf,isHTML,nodeFilter,visibleNamespaces){
	if(nodeFilter){
		node = nodeFilter(node);
		if(node){
			if(typeof node == 'string'){
				buf.push(node);
				return;
			}
		}else{
			return;
		}
		//buf.sort.apply(attrs, attributeSorter);
	}
	switch(node.nodeType){
	case ELEMENT_NODE:
		if (!visibleNamespaces) visibleNamespaces = [];
		var startVisibleNamespaces = visibleNamespaces.length;
		var attrs = node.attributes;
		var len = attrs.length;
		var child = node.firstChild;
		var nodeName = node.tagName;
		
		isHTML =  (htmlns === node.namespaceURI) ||isHTML 
		buf.push('<',nodeName);
		
		
		
		for(var i=0;i<len;i++){
			// add namespaces for attributes
			var attr = attrs.item(i);
			if (attr.prefix == 'xmlns') {
				visibleNamespaces.push({ prefix: attr.localName, namespace: attr.value });
			}else if(attr.nodeName == 'xmlns'){
				visibleNamespaces.push({ prefix: '', namespace: attr.value });
			}
		}
		for(var i=0;i<len;i++){
			var attr = attrs.item(i);
			if (needNamespaceDefine(attr,isHTML, visibleNamespaces)) {
				var prefix = attr.prefix||'';
				var uri = attr.namespaceURI;
				var ns = prefix ? ' xmlns:' + prefix : " xmlns";
				buf.push(ns, '="' , uri , '"');
				visibleNamespaces.push({ prefix: prefix, namespace:uri });
			}
			serializeToString(attr,buf,isHTML,nodeFilter,visibleNamespaces);
		}
		// add namespace for current node		
		if (needNamespaceDefine(node,isHTML, visibleNamespaces)) {
			var prefix = node.prefix||'';
			var uri = node.namespaceURI;
			if (uri) {
				// Avoid empty namespace value like xmlns:ds=""
				// Empty namespace URL will we produce an invalid XML document
				var ns = prefix ? ' xmlns:' + prefix : " xmlns";
				buf.push(ns, '="' , uri , '"');
				visibleNamespaces.push({ prefix: prefix, namespace:uri });
			}
		}
		
		if(child || isHTML && !/^(?:meta|link|img|br|hr|input)$/i.test(nodeName)){
			buf.push('>');
			//if is cdata child node
			if(isHTML && /^script$/i.test(nodeName)){
				while(child){
					if(child.data){
						buf.push(child.data);
					}else{
						serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
					}
					child = child.nextSibling;
				}
			}else
			{
				while(child){
					serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
					child = child.nextSibling;
				}
			}
			buf.push('</',nodeName,'>');
		}else{
			buf.push('/>');
		}
		// remove added visible namespaces
		//visibleNamespaces.length = startVisibleNamespaces;
		return;
	case DOCUMENT_NODE:
	case DOCUMENT_FRAGMENT_NODE:
		var child = node.firstChild;
		while(child){
			serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
			child = child.nextSibling;
		}
		return;
	case ATTRIBUTE_NODE:
		/**
		 * Well-formedness constraint: No < in Attribute Values
		 * The replacement text of any entity referred to directly or indirectly in an attribute value must not contain a <.
		 * @see https://www.w3.org/TR/xml/#CleanAttrVals
		 * @see https://www.w3.org/TR/xml/#NT-AttValue
		 */
		return buf.push(' ', node.name, '="', node.value.replace(/[<&"]/g,_xmlEncoder), '"');
	case TEXT_NODE:
		/**
		 * The ampersand character (&) and the left angle bracket (<) must not appear in their literal form,
		 * except when used as markup delimiters, or within a comment, a processing instruction, or a CDATA section.
		 * If they are needed elsewhere, they must be escaped using either numeric character references or the strings
		 * `&amp;` and `&lt;` respectively.
		 * The right angle bracket (>) may be represented using the string " &gt; ", and must, for compatibility,
		 * be escaped using either `&gt;` or a character reference when it appears in the string `]]>` in content,
		 * when that string is not marking the end of a CDATA section.
		 *
		 * In the content of elements, character data is any string of characters
		 * which does not contain the start-delimiter of any markup
		 * and does not include the CDATA-section-close delimiter, `]]>`.
		 *
		 * @see https://www.w3.org/TR/xml/#NT-CharData
		 */
		return buf.push(node.data
			.replace(/[<&]/g,_xmlEncoder)
			.replace(/]]>/g, ']]&gt;')
		);
	case CDATA_SECTION_NODE:
		return buf.push( '<![CDATA[',node.data,']]>');
	case COMMENT_NODE:
		return buf.push( "<!--",node.data,"-->");
	case DOCUMENT_TYPE_NODE:
		var pubid = node.publicId;
		var sysid = node.systemId;
		buf.push('<!DOCTYPE ',node.name);
		if(pubid){
			buf.push(' PUBLIC ', pubid);
			if (sysid && sysid!='.') {
				buf.push(' ', sysid);
			}
			buf.push('>');
		}else if(sysid && sysid!='.'){
			buf.push(' SYSTEM ', sysid, '>');
		}else{
			var sub = node.internalSubset;
			if(sub){
				buf.push(" [",sub,"]");
			}
			buf.push(">");
		}
		return;
	case PROCESSING_INSTRUCTION_NODE:
		return buf.push( "<?",node.target," ",node.data,"?>");
	case ENTITY_REFERENCE_NODE:
		return buf.push( '&',node.nodeName,';');
	//case ENTITY_NODE:
	//case NOTATION_NODE:
	default:
		buf.push('??',node.nodeName);
	}
}
function importNode(doc,node,deep){
	var node2;
	switch (node.nodeType) {
	case ELEMENT_NODE:
		node2 = node.cloneNode(false);
		node2.ownerDocument = doc;
		//var attrs = node2.attributes;
		//var len = attrs.length;
		//for(var i=0;i<len;i++){
			//node2.setAttributeNodeNS(importNode(doc,attrs.item(i),deep));
		//}
	case DOCUMENT_FRAGMENT_NODE:
		break;
	case ATTRIBUTE_NODE:
		deep = true;
		break;
	//case ENTITY_REFERENCE_NODE:
	//case PROCESSING_INSTRUCTION_NODE:
	////case TEXT_NODE:
	//case CDATA_SECTION_NODE:
	//case COMMENT_NODE:
	//	deep = false;
	//	break;
	//case DOCUMENT_NODE:
	//case DOCUMENT_TYPE_NODE:
	//cannot be imported.
	//case ENTITY_NODE:
	//case NOTATION_NODE：
	//can not hit in level3
	//default:throw e;
	}
	if(!node2){
		node2 = node.cloneNode(false);//false
	}
	node2.ownerDocument = doc;
	node2.parentNode = null;
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(importNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}
//
//var _relationMap = {firstChild:1,lastChild:1,previousSibling:1,nextSibling:1,
//					attributes:1,childNodes:1,parentNode:1,documentElement:1,doctype,};
function cloneNode(doc,node,deep){
	var node2 = new node.constructor();
	for(var n in node){
		var v = node[n];
		if(typeof v != 'object' ){
			if(v != node2[n]){
				node2[n] = v;
			}
		}
	}
	if(node.childNodes){
		node2.childNodes = new NodeList();
	}
	node2.ownerDocument = doc;
	switch (node2.nodeType) {
	case ELEMENT_NODE:
		var attrs	= node.attributes;
		var attrs2	= node2.attributes = new NamedNodeMap();
		var len = attrs.length
		attrs2._ownerElement = node2;
		for(var i=0;i<len;i++){
			node2.setAttributeNode(cloneNode(doc,attrs.item(i),true));
		}
		break;;
	case ATTRIBUTE_NODE:
		deep = true;
	}
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(cloneNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}

function __set__(object,key,value){
	object[key] = value
}
//do dynamic
try{
	if(Object.defineProperty){
		Object.defineProperty(LiveNodeList.prototype,'length',{
			get:function(){
				_updateLiveList(this);
				return this.$$length;
			}
		});
		Object.defineProperty(Node.prototype,'textContent',{
			get:function(){
				return getTextContent(this);
			},
			set:function(data){
				switch(this.nodeType){
				case ELEMENT_NODE:
				case DOCUMENT_FRAGMENT_NODE:
					while(this.firstChild){
						this.removeChild(this.firstChild);
					}
					if(data || String(data)){
						this.appendChild(this.ownerDocument.createTextNode(data));
					}
					break;
				default:
					//TODO:
					this.data = data;
					this.value = data;
					this.nodeValue = data;
				}
			}
		})
		
		function getTextContent(node){
			switch(node.nodeType){
			case ELEMENT_NODE:
			case DOCUMENT_FRAGMENT_NODE:
				var buf = [];
				node = node.firstChild;
				while(node){
					if(node.nodeType!==7 && node.nodeType !==8){
						buf.push(getTextContent(node));
					}
					node = node.nextSibling;
				}
				return buf.join('');
			default:
				return node.nodeValue;
			}
		}
		__set__ = function(object,key,value){
			//console.log(value)
			object['$$'+key] = value
		}
	}
}catch(e){//ie8
}

//if(typeof require == 'function'){
	exports.Node = Node;
	exports.DOMException = DOMException;
	exports.DOMImplementation = DOMImplementation;
	exports.XMLSerializer = XMLSerializer;
//}


/***/ }),

/***/ 568:
/***/ (function(module, __unusedexports, __webpack_require__) {

const core = __webpack_require__(186);
const fetch = __webpack_require__(467);
const { getNextBusinessDay, getGreeting } = __webpack_require__(918);

/**
 * Takes a list of objects and returns an array of blocks for Slack API.
 *
 * @param {Array<object>} list
 * @returns {Array}
 */
function assembleMenuMessage(menu) {
	const greeting = getGreeting();
	const { day } = getNextBusinessDay();

	const headerBlock = {
		type: 'header',
		text: {
			type: 'plain_text',
			text: `${greeting}\nHere is ${day}\'s menu:`,
		},
	};

	const menuBlocks = menu.map(({ type, description }) => {
		return {
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `*${type}*\n${description}`,
			},
		};
	});

	const footerBlock = {
		type: 'context',
		elements: [
			{
				type: 'mrkdwn',
				text: `*Not coming to the office on ${day}? Update your lunch here before 11am:*\nhttps://www.lunsjkollektivet.no/minlunsj`,
			},
		],
	};

	const blocks = [headerBlock, ...menuBlocks, footerBlock];
	core.debug(JSON.stringify(blocks, null, 2));

	return blocks;
}

/**
 * Sends a message to Slack.
 *
 * @param {String} webhook
 * @param {String} channel
 * @param {String} username
 * @param {Array} blocks
 * @returns {Promise<void>}
 */
async function sendSlackMessage(webhook, channel, username, blocks) {
	const payload = {
		channel,
		username,
		icon_emoji: ':green_salad:',
		attachments: [{ blocks }],
	};

	try {
		await fetch(webhook, {
			method: 'POST',
			body: JSON.stringify(payload),
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Length': payload.length,
				Accept: 'application/json',
			},
		});
	} catch (error) {
		throw new Error(`Failed sending slack message: ${res.status}`);
	}
}

module.exports = { assembleMenuMessage, sendSlackMessage };


/***/ }),

/***/ 587:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var Cancel = __webpack_require__(875);

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;

  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;

  // eslint-disable-next-line func-names
  this.promise.then(function(cancel) {
    if (!token._listeners) return;

    var i;
    var l = token._listeners.length;

    for (i = 0; i < l; i++) {
      token._listeners[i](cancel);
    }
    token._listeners = null;
  });

  // eslint-disable-next-line func-names
  this.promise.then = function(onfulfilled) {
    var _resolve;
    // eslint-disable-next-line func-names
    var promise = new Promise(function(resolve) {
      token.subscribe(resolve);
      _resolve = resolve;
    }).then(onfulfilled);

    promise.cancel = function reject() {
      token.unsubscribe(_resolve);
    };

    return promise;
  };

  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Subscribe to the cancel signal
 */

CancelToken.prototype.subscribe = function subscribe(listener) {
  if (this.reason) {
    listener(this.reason);
    return;
  }

  if (this._listeners) {
    this._listeners.push(listener);
  } else {
    this._listeners = [listener];
  }
};

/**
 * Unsubscribe from the cancel signal
 */

CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
  if (!this._listeners) {
    return;
  }
  var index = this._listeners.indexOf(listener);
  if (index !== -1) {
    this._listeners.splice(index, 1);
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;


/***/ }),

/***/ 605:
/***/ (function(module) {

module.exports = require("http");

/***/ }),

/***/ 608:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
    (function standardBrowserEnv() {
      var msie = /(msie|trident)/i.test(navigator.userAgent);
      var urlParsingNode = document.createElement('a');
      var originURL;

      /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
      function resolveURL(url) {
        var href = url;

        if (msie) {
        // IE needs attribute set twice to normalize properties
          urlParsingNode.setAttribute('href', href);
          href = urlParsingNode.href;
        }

        urlParsingNode.setAttribute('href', href);

        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
            urlParsingNode.pathname :
            '/' + urlParsingNode.pathname
        };
      }

      originURL = resolveURL(window.location.href);

      /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
      return function isURLSameOrigin(requestURL) {
        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
        return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
      };
    })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return function isURLSameOrigin() {
        return true;
      };
    })()
);


/***/ }),

/***/ 618:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);
var bind = __webpack_require__(65);
var Axios = __webpack_require__(178);
var mergeConfig = __webpack_require__(831);
var defaults = __webpack_require__(190);

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Expose Cancel & CancelToken
axios.Cancel = __webpack_require__(875);
axios.CancelToken = __webpack_require__(587);
axios.isCancel = __webpack_require__(57);
axios.VERSION = __webpack_require__(322).version;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = __webpack_require__(850);

// Expose isAxiosError
axios.isAxiosError = __webpack_require__(650);

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;


/***/ }),

/***/ 621:
/***/ (function(module) {

"use strict";

module.exports = (flag, argv) => {
	argv = argv || process.argv;
	const prefix = flag.startsWith('-') ? '' : (flag.length === 1 ? '-' : '--');
	const pos = argv.indexOf(prefix + flag);
	const terminatorPos = argv.indexOf('--');
	return pos !== -1 && (terminatorPos === -1 ? true : pos < terminatorPos);
};


/***/ }),

/***/ 622:
/***/ (function(module) {

module.exports = require("path");

/***/ }),

/***/ 632:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var VERSION = __webpack_require__(322).version;

var validators = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
  validators[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

var deprecatedWarnings = {};

/**
 * Transitional option validator
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 * @returns {function}
 */
validators.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return function(value, opt, opts) {
    if (validator === false) {
      throw new Error(formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')));
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

/**
 * Assert object's properties type
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }
  var keys = Object.keys(options);
  var i = keys.length;
  while (i-- > 0) {
    var opt = keys[i];
    var validator = schema[opt];
    if (validator) {
      var value = options[opt];
      var result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new TypeError('option ' + opt + ' must be ' + result);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw Error('Unknown option ' + opt);
    }
  }
}

module.exports = {
  assertOptions: assertOptions,
  validators: validators
};


/***/ }),

/***/ 646:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);

function encode(val) {
  return encodeURIComponent(val).
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};


/***/ }),

/***/ 650:
/***/ (function(module) {

"use strict";


/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */
module.exports = function isAxiosError(payload) {
  return (typeof payload === 'object') && (payload.isAxiosError === true);
};


/***/ }),

/***/ 669:
/***/ (function(module) {

module.exports = require("util");

/***/ }),

/***/ 707:
/***/ (function(module, __unusedexports, __webpack_require__) {

var url = __webpack_require__(835);
var URL = url.URL;
var http = __webpack_require__(605);
var https = __webpack_require__(211);
var Writable = __webpack_require__(413).Writable;
var assert = __webpack_require__(357);
var debug = __webpack_require__(133);

// Create handlers that pass events from native requests
var events = ["abort", "aborted", "connect", "error", "socket", "timeout"];
var eventHandlers = Object.create(null);
events.forEach(function (event) {
  eventHandlers[event] = function (arg1, arg2, arg3) {
    this._redirectable.emit(event, arg1, arg2, arg3);
  };
});

// Error types with codes
var RedirectionError = createErrorType(
  "ERR_FR_REDIRECTION_FAILURE",
  "Redirected request failed"
);
var TooManyRedirectsError = createErrorType(
  "ERR_FR_TOO_MANY_REDIRECTS",
  "Maximum number of redirects exceeded"
);
var MaxBodyLengthExceededError = createErrorType(
  "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
  "Request body larger than maxBodyLength limit"
);
var WriteAfterEndError = createErrorType(
  "ERR_STREAM_WRITE_AFTER_END",
  "write after end"
);

// An HTTP(S) request that can be redirected
function RedirectableRequest(options, responseCallback) {
  // Initialize the request
  Writable.call(this);
  this._sanitizeOptions(options);
  this._options = options;
  this._ended = false;
  this._ending = false;
  this._redirectCount = 0;
  this._redirects = [];
  this._requestBodyLength = 0;
  this._requestBodyBuffers = [];

  // Attach a callback if passed
  if (responseCallback) {
    this.on("response", responseCallback);
  }

  // React to responses of native requests
  var self = this;
  this._onNativeResponse = function (response) {
    self._processResponse(response);
  };

  // Perform the first request
  this._performRequest();
}
RedirectableRequest.prototype = Object.create(Writable.prototype);

RedirectableRequest.prototype.abort = function () {
  abortRequest(this._currentRequest);
  this.emit("abort");
};

// Writes buffered data to the current native request
RedirectableRequest.prototype.write = function (data, encoding, callback) {
  // Writing is not allowed if end has been called
  if (this._ending) {
    throw new WriteAfterEndError();
  }

  // Validate input and shift parameters if necessary
  if (!(typeof data === "string" || typeof data === "object" && ("length" in data))) {
    throw new TypeError("data should be a string, Buffer or Uint8Array");
  }
  if (typeof encoding === "function") {
    callback = encoding;
    encoding = null;
  }

  // Ignore empty buffers, since writing them doesn't invoke the callback
  // https://github.com/nodejs/node/issues/22066
  if (data.length === 0) {
    if (callback) {
      callback();
    }
    return;
  }
  // Only write when we don't exceed the maximum body length
  if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
    this._requestBodyLength += data.length;
    this._requestBodyBuffers.push({ data: data, encoding: encoding });
    this._currentRequest.write(data, encoding, callback);
  }
  // Error when we exceed the maximum body length
  else {
    this.emit("error", new MaxBodyLengthExceededError());
    this.abort();
  }
};

// Ends the current native request
RedirectableRequest.prototype.end = function (data, encoding, callback) {
  // Shift parameters if necessary
  if (typeof data === "function") {
    callback = data;
    data = encoding = null;
  }
  else if (typeof encoding === "function") {
    callback = encoding;
    encoding = null;
  }

  // Write data if needed and end
  if (!data) {
    this._ended = this._ending = true;
    this._currentRequest.end(null, null, callback);
  }
  else {
    var self = this;
    var currentRequest = this._currentRequest;
    this.write(data, encoding, function () {
      self._ended = true;
      currentRequest.end(null, null, callback);
    });
    this._ending = true;
  }
};

// Sets a header value on the current native request
RedirectableRequest.prototype.setHeader = function (name, value) {
  this._options.headers[name] = value;
  this._currentRequest.setHeader(name, value);
};

// Clears a header value on the current native request
RedirectableRequest.prototype.removeHeader = function (name) {
  delete this._options.headers[name];
  this._currentRequest.removeHeader(name);
};

// Global timeout for all underlying requests
RedirectableRequest.prototype.setTimeout = function (msecs, callback) {
  var self = this;

  // Destroys the socket on timeout
  function destroyOnTimeout(socket) {
    socket.setTimeout(msecs);
    socket.removeListener("timeout", socket.destroy);
    socket.addListener("timeout", socket.destroy);
  }

  // Sets up a timer to trigger a timeout event
  function startTimer(socket) {
    if (self._timeout) {
      clearTimeout(self._timeout);
    }
    self._timeout = setTimeout(function () {
      self.emit("timeout");
      clearTimer();
    }, msecs);
    destroyOnTimeout(socket);
  }

  // Stops a timeout from triggering
  function clearTimer() {
    // Clear the timeout
    if (self._timeout) {
      clearTimeout(self._timeout);
      self._timeout = null;
    }

    // Clean up all attached listeners
    self.removeListener("abort", clearTimer);
    self.removeListener("error", clearTimer);
    self.removeListener("response", clearTimer);
    if (callback) {
      self.removeListener("timeout", callback);
    }
    if (!self.socket) {
      self._currentRequest.removeListener("socket", startTimer);
    }
  }

  // Attach callback if passed
  if (callback) {
    this.on("timeout", callback);
  }

  // Start the timer if or when the socket is opened
  if (this.socket) {
    startTimer(this.socket);
  }
  else {
    this._currentRequest.once("socket", startTimer);
  }

  // Clean up on events
  this.on("socket", destroyOnTimeout);
  this.on("abort", clearTimer);
  this.on("error", clearTimer);
  this.on("response", clearTimer);

  return this;
};

// Proxy all other public ClientRequest methods
[
  "flushHeaders", "getHeader",
  "setNoDelay", "setSocketKeepAlive",
].forEach(function (method) {
  RedirectableRequest.prototype[method] = function (a, b) {
    return this._currentRequest[method](a, b);
  };
});

// Proxy all public ClientRequest properties
["aborted", "connection", "socket"].forEach(function (property) {
  Object.defineProperty(RedirectableRequest.prototype, property, {
    get: function () { return this._currentRequest[property]; },
  });
});

RedirectableRequest.prototype._sanitizeOptions = function (options) {
  // Ensure headers are always present
  if (!options.headers) {
    options.headers = {};
  }

  // Since http.request treats host as an alias of hostname,
  // but the url module interprets host as hostname plus port,
  // eliminate the host property to avoid confusion.
  if (options.host) {
    // Use hostname if set, because it has precedence
    if (!options.hostname) {
      options.hostname = options.host;
    }
    delete options.host;
  }

  // Complete the URL object when necessary
  if (!options.pathname && options.path) {
    var searchPos = options.path.indexOf("?");
    if (searchPos < 0) {
      options.pathname = options.path;
    }
    else {
      options.pathname = options.path.substring(0, searchPos);
      options.search = options.path.substring(searchPos);
    }
  }
};


// Executes the next native request (initial or redirect)
RedirectableRequest.prototype._performRequest = function () {
  // Load the native protocol
  var protocol = this._options.protocol;
  var nativeProtocol = this._options.nativeProtocols[protocol];
  if (!nativeProtocol) {
    this.emit("error", new TypeError("Unsupported protocol " + protocol));
    return;
  }

  // If specified, use the agent corresponding to the protocol
  // (HTTP and HTTPS use different types of agents)
  if (this._options.agents) {
    var scheme = protocol.substr(0, protocol.length - 1);
    this._options.agent = this._options.agents[scheme];
  }

  // Create the native request
  var request = this._currentRequest =
        nativeProtocol.request(this._options, this._onNativeResponse);
  this._currentUrl = url.format(this._options);

  // Set up event handlers
  request._redirectable = this;
  for (var e = 0; e < events.length; e++) {
    request.on(events[e], eventHandlers[events[e]]);
  }

  // End a redirected request
  // (The first request must be ended explicitly with RedirectableRequest#end)
  if (this._isRedirect) {
    // Write the request entity and end.
    var i = 0;
    var self = this;
    var buffers = this._requestBodyBuffers;
    (function writeNext(error) {
      // Only write if this request has not been redirected yet
      /* istanbul ignore else */
      if (request === self._currentRequest) {
        // Report any write errors
        /* istanbul ignore if */
        if (error) {
          self.emit("error", error);
        }
        // Write the next buffer if there are still left
        else if (i < buffers.length) {
          var buffer = buffers[i++];
          /* istanbul ignore else */
          if (!request.finished) {
            request.write(buffer.data, buffer.encoding, writeNext);
          }
        }
        // End the request if `end` has been called on us
        else if (self._ended) {
          request.end();
        }
      }
    }());
  }
};

// Processes a response from the current native request
RedirectableRequest.prototype._processResponse = function (response) {
  // Store the redirected response
  var statusCode = response.statusCode;
  if (this._options.trackRedirects) {
    this._redirects.push({
      url: this._currentUrl,
      headers: response.headers,
      statusCode: statusCode,
    });
  }

  // RFC7231§6.4: The 3xx (Redirection) class of status code indicates
  // that further action needs to be taken by the user agent in order to
  // fulfill the request. If a Location header field is provided,
  // the user agent MAY automatically redirect its request to the URI
  // referenced by the Location field value,
  // even if the specific status code is not understood.

  // If the response is not a redirect; return it as-is
  var location = response.headers.location;
  if (!location || this._options.followRedirects === false ||
      statusCode < 300 || statusCode >= 400) {
    response.responseUrl = this._currentUrl;
    response.redirects = this._redirects;
    this.emit("response", response);

    // Clean up
    this._requestBodyBuffers = [];
    return;
  }

  // The response is a redirect, so abort the current request
  abortRequest(this._currentRequest);
  // Discard the remainder of the response to avoid waiting for data
  response.destroy();

  // RFC7231§6.4: A client SHOULD detect and intervene
  // in cyclical redirections (i.e., "infinite" redirection loops).
  if (++this._redirectCount > this._options.maxRedirects) {
    this.emit("error", new TooManyRedirectsError());
    return;
  }

  // RFC7231§6.4: Automatic redirection needs to done with
  // care for methods not known to be safe, […]
  // RFC7231§6.4.2–3: For historical reasons, a user agent MAY change
  // the request method from POST to GET for the subsequent request.
  if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" ||
      // RFC7231§6.4.4: The 303 (See Other) status code indicates that
      // the server is redirecting the user agent to a different resource […]
      // A user agent can perform a retrieval request targeting that URI
      // (a GET or HEAD request if using HTTP) […]
      (statusCode === 303) && !/^(?:GET|HEAD)$/.test(this._options.method)) {
    this._options.method = "GET";
    // Drop a possible entity and headers related to it
    this._requestBodyBuffers = [];
    removeMatchingHeaders(/^content-/i, this._options.headers);
  }

  // Drop the Host header, as the redirect might lead to a different host
  var currentHostHeader = removeMatchingHeaders(/^host$/i, this._options.headers);

  // If the redirect is relative, carry over the host of the last request
  var currentUrlParts = url.parse(this._currentUrl);
  var currentHost = currentHostHeader || currentUrlParts.host;
  var currentUrl = /^\w+:/.test(location) ? this._currentUrl :
    url.format(Object.assign(currentUrlParts, { host: currentHost }));

  // Determine the URL of the redirection
  var redirectUrl;
  try {
    redirectUrl = url.resolve(currentUrl, location);
  }
  catch (cause) {
    this.emit("error", new RedirectionError(cause));
    return;
  }

  // Create the redirected request
  debug("redirecting to", redirectUrl);
  this._isRedirect = true;
  var redirectUrlParts = url.parse(redirectUrl);
  Object.assign(this._options, redirectUrlParts);

  // Drop confidential headers when redirecting to a less secure protocol
  // or to a different domain that is not a superdomain
  if (redirectUrlParts.protocol !== currentUrlParts.protocol &&
     redirectUrlParts.protocol !== "https:" ||
     redirectUrlParts.host !== currentHost &&
     !isSubdomain(redirectUrlParts.host, currentHost)) {
    removeMatchingHeaders(/^(?:authorization|cookie)$/i, this._options.headers);
  }

  // Evaluate the beforeRedirect callback
  if (typeof this._options.beforeRedirect === "function") {
    var responseDetails = { headers: response.headers };
    try {
      this._options.beforeRedirect.call(null, this._options, responseDetails);
    }
    catch (err) {
      this.emit("error", err);
      return;
    }
    this._sanitizeOptions(this._options);
  }

  // Perform the redirected request
  try {
    this._performRequest();
  }
  catch (cause) {
    this.emit("error", new RedirectionError(cause));
  }
};

// Wraps the key/value object of protocols with redirect functionality
function wrap(protocols) {
  // Default settings
  var exports = {
    maxRedirects: 21,
    maxBodyLength: 10 * 1024 * 1024,
  };

  // Wrap each protocol
  var nativeProtocols = {};
  Object.keys(protocols).forEach(function (scheme) {
    var protocol = scheme + ":";
    var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
    var wrappedProtocol = exports[scheme] = Object.create(nativeProtocol);

    // Executes a request, following redirects
    function request(input, options, callback) {
      // Parse parameters
      if (typeof input === "string") {
        var urlStr = input;
        try {
          input = urlToOptions(new URL(urlStr));
        }
        catch (err) {
          /* istanbul ignore next */
          input = url.parse(urlStr);
        }
      }
      else if (URL && (input instanceof URL)) {
        input = urlToOptions(input);
      }
      else {
        callback = options;
        options = input;
        input = { protocol: protocol };
      }
      if (typeof options === "function") {
        callback = options;
        options = null;
      }

      // Set defaults
      options = Object.assign({
        maxRedirects: exports.maxRedirects,
        maxBodyLength: exports.maxBodyLength,
      }, input, options);
      options.nativeProtocols = nativeProtocols;

      assert.equal(options.protocol, protocol, "protocol mismatch");
      debug("options", options);
      return new RedirectableRequest(options, callback);
    }

    // Executes a GET request, following redirects
    function get(input, options, callback) {
      var wrappedRequest = wrappedProtocol.request(input, options, callback);
      wrappedRequest.end();
      return wrappedRequest;
    }

    // Expose the properties on the wrapped protocol
    Object.defineProperties(wrappedProtocol, {
      request: { value: request, configurable: true, enumerable: true, writable: true },
      get: { value: get, configurable: true, enumerable: true, writable: true },
    });
  });
  return exports;
}

/* istanbul ignore next */
function noop() { /* empty */ }

// from https://github.com/nodejs/node/blob/master/lib/internal/url.js
function urlToOptions(urlObject) {
  var options = {
    protocol: urlObject.protocol,
    hostname: urlObject.hostname.startsWith("[") ?
      /* istanbul ignore next */
      urlObject.hostname.slice(1, -1) :
      urlObject.hostname,
    hash: urlObject.hash,
    search: urlObject.search,
    pathname: urlObject.pathname,
    path: urlObject.pathname + urlObject.search,
    href: urlObject.href,
  };
  if (urlObject.port !== "") {
    options.port = Number(urlObject.port);
  }
  return options;
}

function removeMatchingHeaders(regex, headers) {
  var lastValue;
  for (var header in headers) {
    if (regex.test(header)) {
      lastValue = headers[header];
      delete headers[header];
    }
  }
  return (lastValue === null || typeof lastValue === "undefined") ?
    undefined : String(lastValue).trim();
}

function createErrorType(code, defaultMessage) {
  function CustomError(cause) {
    Error.captureStackTrace(this, this.constructor);
    if (!cause) {
      this.message = defaultMessage;
    }
    else {
      this.message = defaultMessage + ": " + cause.message;
      this.cause = cause;
    }
  }
  CustomError.prototype = new Error();
  CustomError.prototype.constructor = CustomError;
  CustomError.prototype.name = "Error [" + code + "]";
  CustomError.prototype.code = code;
  return CustomError;
}

function abortRequest(request) {
  for (var e = 0; e < events.length; e++) {
    request.removeListener(events[e], eventHandlers[events[e]]);
  }
  request.on("error", noop);
  request.abort();
}

function isSubdomain(subdomain, domain) {
  const dot = subdomain.length - domain.length - 1;
  return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
}

// Exports
module.exports = wrap({ http: http, https: https });
module.exports.wrap = wrap;


/***/ }),

/***/ 717:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

// For internal use, subject to change.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueCommand = void 0;
// We use any as a valid input type
/* eslint-disable @typescript-eslint/no-explicit-any */
const fs = __importStar(__webpack_require__(747));
const os = __importStar(__webpack_require__(87));
const utils_1 = __webpack_require__(278);
function issueCommand(command, message) {
    const filePath = process.env[`GITHUB_${command}`];
    if (!filePath) {
        throw new Error(`Unable to find environment variable for file command ${command}`);
    }
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing file at path: ${filePath}`);
    }
    fs.appendFileSync(filePath, `${utils_1.toCommandValue(message)}${os.EOL}`, {
        encoding: 'utf8'
    });
}
exports.issueCommand = issueCommand;
//# sourceMappingURL=file-command.js.map

/***/ }),

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ }),

/***/ 761:
/***/ (function(module) {

module.exports = require("zlib");

/***/ }),

/***/ 778:
/***/ (function(__unusedmodule, exports) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.langCodes = exports.BaseTranslator = void 0;
// TODO: Add language codes with long format `lang-sublang`
// Unsupported: ["bn-BD","bs-Latn","yue","otq","zh-Hant","zh-Hans","tlh","sr-Cyrl","sr-Latn","fil","mww","yua","mhr","pap","ceb","mrj","udm"]
// Valid ISO 639-2 codes
// eslint-disable
// prettier-ignore
var langCodes = ["aa", "ab", "af", "ak", "sq", "am", "ar", "an", "hy", "as", "av", "ae", "ay", "az", "ba", "bm", "eu", "be", "bn", "bh", "bi", "bo", "bs", "br", "bg", "my", "ca", "cs", "ch", "ce", "zh", "cu", "cv", "kw", "co", "cr", "cy", "da", "de", "dv", "nl", "dz", "el", "en", "eo", "et", "ee", "fo", "fa", "fj", "fi", "fr", "fy", "ff", "ka", "gd", "ga", "gl", "gv", "gn", "gu", "ht", "ha", "he", "hz", "hi", "ho", "hr", "hu", "ig", "is", "io", "ii", "iu", "ie", "ia", "id", "ik", "it", "jv", "ja", "kl", "kn", "ks", "kr", "kk", "km", "ki", "rw", "ky", "kv", "kg", "ko", "kj", "ku", "lo", "la", "lv", "li", "ln", "lt", "lb", "lu", "lg", "mk", "mh", "ml", "mi", "mr", "ms", "mg", "mt", "mn", "na", "nv", "nr", "nd", "ng", "ne", "nn", "nb", "no", "ny", "oc", "oj", "or", "om", "os", "pa", "pi", "pl", "pt", "ps", "qu", "rm", "ro", "rn", "ru", "sg", "sa", "si", "sk", "sl", "se", "sm", "sn", "sd", "so", "st", "es", "sc", "sr", "ss", "su", "sw", "sv", "ty", "ta", "tt", "te", "tg", "tl", "th", "ti", "to", "tn", "ts", "tk", "tr", "tw", "ug", "uk", "ur", "uz", "ve", "vi", "vo", "wa", "wo", "xh", "yi", "yo", "za", "zu"];
/**
 * Basic abstract class for translator
 */

exports.langCodes = langCodes;

var BaseTranslator =
/** @class */
function () {
  function BaseTranslator(options) {
    var _this = this;

    this.options = {};
    /**
     * Util to wrap url to CORS proxy
     */

    this.wrapUrlToCorsProxy = function (url) {
      // Use as prefix
      if (typeof _this.options.corsProxy === 'string') {
        return _this.options.corsProxy + url;
      } // Run user defined transformation


      if (typeof _this.options.corsProxy === 'function') {
        return _this.options.corsProxy(url);
      }

      return url;
    };

    if (options !== undefined) {
      this.options = options;
    }
  }

  BaseTranslator.prototype.checkLimitExceeding = function (text) {
    var plainText = Array.isArray(text) ? text.join('') : text;
    var extra = plainText.length - this.getLengthLimit();
    return extra > 0 ? extra : 0;
  };

  BaseTranslator.translatorName = 'UnknownTranslator';

  BaseTranslator.isRequiredKey = function () {
    return false;
  };

  BaseTranslator.isSupportedAutoFrom = function () {
    return false;
  };

  BaseTranslator.getSupportedLanguages = function () {
    return [];
  };

  return BaseTranslator;
}();

exports.BaseTranslator = BaseTranslator;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInR5cGVzL1RyYW5zbGF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNPLElBQU0sU0FBUyxHQUFVLENBQy9CLElBRCtCLEVBQ3pCLElBRHlCLEVBQ25CLElBRG1CLEVBQ2IsSUFEYSxFQUNQLElBRE8sRUFDRCxJQURDLEVBQ0ssSUFETCxFQUNXLElBRFgsRUFDaUIsSUFEakIsRUFDdUIsSUFEdkIsRUFFL0IsSUFGK0IsRUFFekIsSUFGeUIsRUFFbkIsSUFGbUIsRUFFYixJQUZhLEVBRVAsSUFGTyxFQUVELElBRkMsRUFFSyxJQUZMLEVBRVcsSUFGWCxFQUVpQixJQUZqQixFQUV1QixJQUZ2QixFQUcvQixJQUgrQixFQUd6QixJQUh5QixFQUduQixJQUhtQixFQUdiLElBSGEsRUFHUCxJQUhPLEVBR0QsSUFIQyxFQUdLLElBSEwsRUFHVyxJQUhYLEVBR2lCLElBSGpCLEVBR3VCLElBSHZCLEVBSS9CLElBSitCLEVBSXpCLElBSnlCLEVBSW5CLElBSm1CLEVBSWIsSUFKYSxFQUlQLElBSk8sRUFJRCxJQUpDLEVBSUssSUFKTCxFQUlXLElBSlgsRUFJaUIsSUFKakIsRUFJdUIsSUFKdkIsRUFLL0IsSUFMK0IsRUFLekIsSUFMeUIsRUFLbkIsSUFMbUIsRUFLYixJQUxhLEVBS1AsSUFMTyxFQUtELElBTEMsRUFLSyxJQUxMLEVBS1csSUFMWCxFQUtpQixJQUxqQixFQUt1QixJQUx2QixFQU0vQixJQU4rQixFQU16QixJQU55QixFQU1uQixJQU5tQixFQU1iLElBTmEsRUFNUCxJQU5PLEVBTUQsSUFOQyxFQU1LLElBTkwsRUFNVyxJQU5YLEVBTWlCLElBTmpCLEVBTXVCLElBTnZCLEVBTy9CLElBUCtCLEVBT3pCLElBUHlCLEVBT25CLElBUG1CLEVBT2IsSUFQYSxFQU9QLElBUE8sRUFPRCxJQVBDLEVBT0ssSUFQTCxFQU9XLElBUFgsRUFPaUIsSUFQakIsRUFPdUIsSUFQdkIsRUFRL0IsSUFSK0IsRUFRekIsSUFSeUIsRUFRbkIsSUFSbUIsRUFRYixJQVJhLEVBUVAsSUFSTyxFQVFELElBUkMsRUFRSyxJQVJMLEVBUVcsSUFSWCxFQVFpQixJQVJqQixFQVF1QixJQVJ2QixFQVMvQixJQVQrQixFQVN6QixJQVR5QixFQVNuQixJQVRtQixFQVNiLElBVGEsRUFTUCxJQVRPLEVBU0QsSUFUQyxFQVNLLElBVEwsRUFTVyxJQVRYLEVBU2lCLElBVGpCLEVBU3VCLElBVHZCLEVBVS9CLElBVitCLEVBVXpCLElBVnlCLEVBVW5CLElBVm1CLEVBVWIsSUFWYSxFQVVQLElBVk8sRUFVRCxJQVZDLEVBVUssSUFWTCxFQVVXLElBVlgsRUFVaUIsSUFWakIsRUFVdUIsSUFWdkIsRUFXL0IsSUFYK0IsRUFXekIsSUFYeUIsRUFXbkIsSUFYbUIsRUFXYixJQVhhLEVBV1AsSUFYTyxFQVdELElBWEMsRUFXSyxJQVhMLEVBV1csSUFYWCxFQVdpQixJQVhqQixFQVd1QixJQVh2QixFQVkvQixJQVorQixFQVl6QixJQVp5QixFQVluQixJQVptQixFQVliLElBWmEsRUFZUCxJQVpPLEVBWUQsSUFaQyxFQVlLLElBWkwsRUFZVyxJQVpYLEVBWWlCLElBWmpCLEVBWXVCLElBWnZCLEVBYS9CLElBYitCLEVBYXpCLElBYnlCLEVBYW5CLElBYm1CLEVBYWIsSUFiYSxFQWFQLElBYk8sRUFhRCxJQWJDLEVBYUssSUFiTCxFQWFXLElBYlgsRUFhaUIsSUFiakIsRUFhdUIsSUFidkIsRUFjL0IsSUFkK0IsRUFjekIsSUFkeUIsRUFjbkIsSUFkbUIsRUFjYixJQWRhLEVBY1AsSUFkTyxFQWNELElBZEMsRUFjSyxJQWRMLEVBY1csSUFkWCxFQWNpQixJQWRqQixFQWN1QixJQWR2QixFQWUvQixJQWYrQixFQWV6QixJQWZ5QixFQWVuQixJQWZtQixFQWViLElBZmEsRUFlUCxJQWZPLEVBZUQsSUFmQyxFQWVLLElBZkwsRUFlVyxJQWZYLEVBZWlCLElBZmpCLEVBZXVCLElBZnZCLEVBZ0IvQixJQWhCK0IsRUFnQnpCLElBaEJ5QixFQWdCbkIsSUFoQm1CLEVBZ0JiLElBaEJhLEVBZ0JQLElBaEJPLEVBZ0JELElBaEJDLEVBZ0JLLElBaEJMLEVBZ0JXLElBaEJYLEVBZ0JpQixJQWhCakIsRUFnQnVCLElBaEJ2QixFQWlCL0IsSUFqQitCLEVBaUJ6QixJQWpCeUIsRUFpQm5CLElBakJtQixFQWlCYixJQWpCYSxFQWlCUCxJQWpCTyxFQWlCRCxJQWpCQyxFQWlCSyxJQWpCTCxFQWlCVyxJQWpCWCxFQWlCaUIsSUFqQmpCLEVBaUJ1QixJQWpCdkIsRUFrQi9CLElBbEIrQixFQWtCekIsSUFsQnlCLEVBa0JuQixJQWxCbUIsRUFrQmIsSUFsQmEsRUFrQlAsSUFsQk8sRUFrQkQsSUFsQkMsRUFrQkssSUFsQkwsRUFrQlcsSUFsQlgsRUFrQmlCLElBbEJqQixFQWtCdUIsSUFsQnZCLEVBbUIvQixJQW5CK0IsRUFtQnpCLElBbkJ5QixFQW1CbkIsSUFuQm1CLEVBbUJiLElBbkJhLENBQXpCO0FBb0pQOztBQUVHOzs7O0FBQ0gsSUFBQSxjQUFBO0FBQUE7QUFBQSxZQUFBO0FBZ0JDLFdBQUEsY0FBQSxDQUFZLE9BQVosRUFBMkM7QUFBM0MsUUFBQSxLQUFBLEdBQUEsSUFBQTs7QUFEbUIsU0FBQSxPQUFBLEdBQWlDLEVBQWpDO0FBeUJuQjs7QUFFRzs7QUFDTyxTQUFBLGtCQUFBLEdBQXFCLFVBQUMsR0FBRCxFQUFZO0FBQzFDO0FBQ0EsVUFBSSxPQUFPLEtBQUksQ0FBQyxPQUFMLENBQWEsU0FBcEIsS0FBa0MsUUFBdEMsRUFBZ0Q7QUFDL0MsZUFBTyxLQUFJLENBQUMsT0FBTCxDQUFhLFNBQWIsR0FBeUIsR0FBaEM7QUFDQSxPQUp5QyxDQU0xQzs7O0FBQ0EsVUFBSSxPQUFPLEtBQUksQ0FBQyxPQUFMLENBQWEsU0FBcEIsS0FBa0MsVUFBdEMsRUFBa0Q7QUFDakQsZUFBTyxLQUFJLENBQUMsT0FBTCxDQUFhLFNBQWIsQ0FBdUIsR0FBdkIsQ0FBUDtBQUNBOztBQUVELGFBQU8sR0FBUDtBQUNBLEtBWlM7O0FBMUJULFFBQUksT0FBTyxLQUFLLFNBQWhCLEVBQTJCO0FBQzFCLFdBQUssT0FBTCxHQUFlLE9BQWY7QUFDQTtBQUNEOztBQWNNLEVBQUEsY0FBQSxDQUFBLFNBQUEsQ0FBQSxtQkFBQSxHQUFQLFVBQTJCLElBQTNCLEVBQWtEO0FBQ2pELFFBQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxPQUFOLENBQWMsSUFBZCxJQUFzQixJQUFJLENBQUMsSUFBTCxDQUFVLEVBQVYsQ0FBdEIsR0FBc0MsSUFBeEQ7QUFDQSxRQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsTUFBVixHQUFtQixLQUFLLGNBQUwsRUFBakM7QUFDQSxXQUFPLEtBQUssR0FBRyxDQUFSLEdBQVksS0FBWixHQUFvQixDQUEzQjtBQUNBLEdBSk07O0FBL0JnQixFQUFBLGNBQUEsQ0FBQSxjQUFBLEdBQXlCLG1CQUF6Qjs7QUFFVCxFQUFBLGNBQUEsQ0FBQSxhQUFBLEdBQWdCLFlBQUE7QUFBTSxXQUFBLEtBQUE7QUFBSyxHQUEzQjs7QUFFQSxFQUFBLGNBQUEsQ0FBQSxtQkFBQSxHQUFzQixZQUFBO0FBQU0sV0FBQSxLQUFBO0FBQUssR0FBakM7O0FBRUEsRUFBQSxjQUFBLENBQUEscUJBQUEsR0FBd0IsWUFBQTtBQUFrQixXQUFBLEVBQUE7QUFBRSxHQUE1Qzs7QUErQ2YsU0FBQSxjQUFBO0FBQUMsQ0F4REQsRUFBQSIsInNvdXJjZXNDb250ZW50IjpbIi8vIFRPRE86IEFkZCBsYW5ndWFnZSBjb2RlcyB3aXRoIGxvbmcgZm9ybWF0IGBsYW5nLXN1YmxhbmdgXG4vLyBVbnN1cHBvcnRlZDogW1wiYm4tQkRcIixcImJzLUxhdG5cIixcInl1ZVwiLFwib3RxXCIsXCJ6aC1IYW50XCIsXCJ6aC1IYW5zXCIsXCJ0bGhcIixcInNyLUN5cmxcIixcInNyLUxhdG5cIixcImZpbFwiLFwibXd3XCIsXCJ5dWFcIixcIm1oclwiLFwicGFwXCIsXCJjZWJcIixcIm1yalwiLFwidWRtXCJdXG5cbi8vIFZhbGlkIElTTyA2MzktMiBjb2Rlc1xuLy8gZXNsaW50LWRpc2FibGVcbi8vIHByZXR0aWVyLWlnbm9yZVxuZXhwb3J0IGNvbnN0IGxhbmdDb2RlcyA9IDxjb25zdD5bXG5cdFwiYWFcIiwgXCJhYlwiLCBcImFmXCIsIFwiYWtcIiwgXCJzcVwiLCBcImFtXCIsIFwiYXJcIiwgXCJhblwiLCBcImh5XCIsIFwiYXNcIixcblx0XCJhdlwiLCBcImFlXCIsIFwiYXlcIiwgXCJhelwiLCBcImJhXCIsIFwiYm1cIiwgXCJldVwiLCBcImJlXCIsIFwiYm5cIiwgXCJiaFwiLFxuXHRcImJpXCIsIFwiYm9cIiwgXCJic1wiLCBcImJyXCIsIFwiYmdcIiwgXCJteVwiLCBcImNhXCIsIFwiY3NcIiwgXCJjaFwiLCBcImNlXCIsXG5cdFwiemhcIiwgXCJjdVwiLCBcImN2XCIsIFwia3dcIiwgXCJjb1wiLCBcImNyXCIsIFwiY3lcIiwgXCJkYVwiLCBcImRlXCIsIFwiZHZcIixcblx0XCJubFwiLCBcImR6XCIsIFwiZWxcIiwgXCJlblwiLCBcImVvXCIsIFwiZXRcIiwgXCJlZVwiLCBcImZvXCIsIFwiZmFcIiwgXCJmalwiLFxuXHRcImZpXCIsIFwiZnJcIiwgXCJmeVwiLCBcImZmXCIsIFwia2FcIiwgXCJnZFwiLCBcImdhXCIsIFwiZ2xcIiwgXCJndlwiLCBcImduXCIsXG5cdFwiZ3VcIiwgXCJodFwiLCBcImhhXCIsIFwiaGVcIiwgXCJoelwiLCBcImhpXCIsIFwiaG9cIiwgXCJoclwiLCBcImh1XCIsIFwiaWdcIixcblx0XCJpc1wiLCBcImlvXCIsIFwiaWlcIiwgXCJpdVwiLCBcImllXCIsIFwiaWFcIiwgXCJpZFwiLCBcImlrXCIsIFwiaXRcIiwgXCJqdlwiLFxuXHRcImphXCIsIFwia2xcIiwgXCJrblwiLCBcImtzXCIsIFwia3JcIiwgXCJra1wiLCBcImttXCIsIFwia2lcIiwgXCJyd1wiLCBcImt5XCIsXG5cdFwia3ZcIiwgXCJrZ1wiLCBcImtvXCIsIFwia2pcIiwgXCJrdVwiLCBcImxvXCIsIFwibGFcIiwgXCJsdlwiLCBcImxpXCIsIFwibG5cIixcblx0XCJsdFwiLCBcImxiXCIsIFwibHVcIiwgXCJsZ1wiLCBcIm1rXCIsIFwibWhcIiwgXCJtbFwiLCBcIm1pXCIsIFwibXJcIiwgXCJtc1wiLFxuXHRcIm1nXCIsIFwibXRcIiwgXCJtblwiLCBcIm5hXCIsIFwibnZcIiwgXCJuclwiLCBcIm5kXCIsIFwibmdcIiwgXCJuZVwiLCBcIm5uXCIsXG5cdFwibmJcIiwgXCJub1wiLCBcIm55XCIsIFwib2NcIiwgXCJvalwiLCBcIm9yXCIsIFwib21cIiwgXCJvc1wiLCBcInBhXCIsIFwicGlcIixcblx0XCJwbFwiLCBcInB0XCIsIFwicHNcIiwgXCJxdVwiLCBcInJtXCIsIFwicm9cIiwgXCJyblwiLCBcInJ1XCIsIFwic2dcIiwgXCJzYVwiLFxuXHRcInNpXCIsIFwic2tcIiwgXCJzbFwiLCBcInNlXCIsIFwic21cIiwgXCJzblwiLCBcInNkXCIsIFwic29cIiwgXCJzdFwiLCBcImVzXCIsXG5cdFwic2NcIiwgXCJzclwiLCBcInNzXCIsIFwic3VcIiwgXCJzd1wiLCBcInN2XCIsIFwidHlcIiwgXCJ0YVwiLCBcInR0XCIsIFwidGVcIixcblx0XCJ0Z1wiLCBcInRsXCIsIFwidGhcIiwgXCJ0aVwiLCBcInRvXCIsIFwidG5cIiwgXCJ0c1wiLCBcInRrXCIsIFwidHJcIiwgXCJ0d1wiLFxuXHRcInVnXCIsIFwidWtcIiwgXCJ1clwiLCBcInV6XCIsIFwidmVcIiwgXCJ2aVwiLCBcInZvXCIsIFwid2FcIiwgXCJ3b1wiLCBcInhoXCIsXG5cdFwieWlcIiwgXCJ5b1wiLCBcInphXCIsIFwienVcIlxuXTtcblxuLy8gZXNsaW50LWVuYWJsZVxuXG5leHBvcnQgdHlwZSBsYW5nQ29kZSA9IHR5cGVvZiBsYW5nQ29kZXNbbnVtYmVyXTtcbmV4cG9ydCB0eXBlIGxhbmdDb2RlV2l0aEF1dG8gPSAnYXV0bycgfCBsYW5nQ29kZTtcblxuZXhwb3J0IGludGVyZmFjZSBUcmFuc2xhdG9ySW5zdGFuY2VNZW1iZXJzIHtcblx0LyoqXG5cdCAqIFRyYW5zbGF0ZSB0ZXh0IGZyb20gc3RyaW5nXG5cdCAqIEByZXR1cm5zIFRyYW5zbGF0ZWQgc3RyaW5nXG5cdCAqL1xuXHR0cmFuc2xhdGUoXG5cdFx0dGV4dDogc3RyaW5nLFxuXHRcdGxhbmdGcm9tOiBsYW5nQ29kZVdpdGhBdXRvLFxuXHRcdGxhbmdUbzogbGFuZ0NvZGUsXG5cdCk6IFByb21pc2U8c3RyaW5nPjtcblxuXHQvKipcblx0ICogVHJhbnNsYXRlIHRleHQgZnJvbSBhcnJheSBvZiBzdHJpbmdcblx0ICogQHJldHVybnMgQXJyYXkgd2l0aCB0cmFuc2xhdGVkIHN0cmluZ3MgYW5kIHNhbWUgbGVuZ3RoIGFzIGlucHV0IGFycmF5XG5cdCAqIEByZXR1cm5zIFRleHQgd2hpY2ggZGlkIG5vdCB0cmFuc2xhdGVkIHdpbGwgcmVwbGFjZWQgdG8gYG51bGxgXG5cdCAqL1xuXHR0cmFuc2xhdGVCYXRjaChcblx0XHR0ZXh0OiBzdHJpbmdbXSxcblx0XHRsYW5nRnJvbTogbGFuZ0NvZGVXaXRoQXV0byxcblx0XHRsYW5nVG86IGxhbmdDb2RlLFxuXHQpOiBQcm9taXNlPEFycmF5PHN0cmluZyB8IG51bGw+PjtcblxuXHQvKipcblx0ICogQ2hlY2sgc3RyaW5nIG9yIGFycmF5IG9mIHN0aW5ncyB0byBleGNlZWRpbmcgb2YgYSBsaW1pdFxuXHQgKlxuXHQgKiBJdCBuZWVkIGZvciBtb2R1bGVzIHdpdGggY29tcGxleGl0eSBsb2dpYyBvZiBlbmNvZGluZyBhIHN0cmluZ3MuXG5cdCAqIEZvciBleGFtcGxlLCB3aGVuIGluIGB0cmFuc2xhdGVCYXRjaGAgdGV4dCBtZXJnZSB0byBzdHJpbmdcblx0ICogYW5kIHNwbGl0IHRvIGNodW5rcyBieSB0b2tlbnMgd2l0aCBJRDogYDxpZDE+VGV4dCAxPC9pZDE+PGlkMj5UZXh0IDI8L2lkMj5gXG5cdCAqXG5cdCAqIEhlcmUgY2hlY2tlZCByZXN1bHQgb2YgZW5jb2RpbmcgYSBpbnB1dCBkYXRhXG5cdCAqIEByZXR1cm5zIG51bWJlciBvZiBleHRyYSBjaGFyc1xuXHQgKi9cblx0Y2hlY2tMaW1pdEV4Y2VlZGluZyh0ZXh0OiBzdHJpbmcgfCBzdHJpbmdbXSk6IG51bWJlcjtcblxuXHQvKipcblx0ICogQ2hlY2sgc3VwcG9ydGluZyBvZiB0cmFuc2xhdGUgZGlyZWN0aW9uXG5cdCAqL1xuXHRjaGVja0RpcmVjdGlvbj86IChsYW5nRnJvbTogbGFuZ0NvZGVXaXRoQXV0bywgbGFuZ1RvOiBsYW5nQ29kZSkgPT4gYm9vbGVhbjtcblxuXHQvKipcblx0ICogTWF4IGxlbmd0aCBvZiBzdHJpbmcgZm9yIGB0cmFuc2xhdGVgIG9yIHRvdGFsIGxlbmd0aCBvZiBzdHJpbmdzIGZyb20gYXJyYXkgZm9yIGB0cmFuc2xhdGVCYXRjaGBcblx0ICovXG5cdGdldExlbmd0aExpbWl0KCk6IG51bWJlcjtcblxuXHQvKipcblx0ICogUmVjb21tZW5kZWQgZGVsYXkgYmV0d2VlbiByZXF1ZXN0c1xuXHQgKi9cblx0Z2V0UmVxdWVzdHNUaW1lb3V0OiAoKSA9PiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNsYXRvclN0YXRpY01lbWJlcnMge1xuXHQvKipcblx0ICogUHVibGljIHRyYW5zbGF0b3IgbmFtZSB0byBkaXNwbGF5aW5nXG5cdCAqL1xuXHRyZWFkb25seSB0cmFuc2xhdG9yTmFtZTogc3RyaW5nO1xuXG5cdC8qKlxuXHQgKiBJcyByZXF1aXJlZCBBUEkga2V5IGZvciB0aGlzIG1vZHVsZVxuXHQgKi9cblx0aXNSZXF1aXJlZEtleSgpOiBib29sZWFuO1xuXG5cdC8qKlxuXHQgKiBJcyBpdCBzdXBwb3J0ZWQgdmFsdWUgYGF1dG9gIGluIGBsYW5nRnJvbWAgYXJndW1lbnQgb2YgYHRyYW5zbGF0ZWAgYW5kIGB0cmFuc2xhdGVCYXRjaGAgbWV0aG9kc1xuXHQgKi9cblx0aXNTdXBwb3J0ZWRBdXRvRnJvbSgpOiBib29sZWFuO1xuXG5cdC8qKlxuXHQgKiBBcnJheSBvZiBzdXBwb3J0ZWQgbGFuZ3VhZ2VzIGFzIElTTyA2MzktMSBjb2Rlc1xuXHQgKi9cblx0Z2V0U3VwcG9ydGVkTGFuZ3VhZ2VzKCk6IGxhbmdDb2RlW107XG59XG5cbi8qKlxuICogQmFzZSB0cmFuc2xhdG9yIG9iamVjdCBjb250cmFjdFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRyYW5zbGF0b3JDbGFzczxcblx0QyBleHRlbmRzIFRyYW5zbGF0b3JJbnN0YW5jZU1lbWJlcnMgPSBUcmFuc2xhdG9ySW5zdGFuY2VNZW1iZXJzLFxuPiBleHRlbmRzIFRyYW5zbGF0b3JTdGF0aWNNZW1iZXJzIHtcblx0bmV3ICguLi5hcmdzOiBhbnlbXSk6IEM7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNsYXRvckluc3RhbmNlXG5cdGV4dGVuZHMgVHJhbnNsYXRvclN0YXRpY01lbWJlcnMsXG5cdFx0VHJhbnNsYXRvckluc3RhbmNlTWVtYmVycyB7fVxuXG4vL1xuLy8gQmFzZSBpbXBsZW1lbnRhdGlvblxuLy9cblxuZXhwb3J0IHR5cGUgQ29yc1Byb3h5ID0gc3RyaW5nIHwgKCh1cmw6IHN0cmluZykgPT4gc3RyaW5nKTtcblxuZXhwb3J0IGludGVyZmFjZSBUcmFuc2xhdG9yT3B0aW9ucyB7XG5cdC8qKlxuXHQgKiBBY2Nlc3Mga2V5IGZvciByZXF1ZXN0cyB0byB0cmFuc2xhdG9yIEFQSVxuXHQgKi9cblx0YXBpS2V5Pzogc3RyaW5nO1xuXG5cdC8qKlxuXHQgKiBVbmlvbiB0ZXh0IGFycmF5IHRvIDEgcmVxdWVzdCAob3IgbW9yZSwgYnV0IGxlc3MgdGhhbiB1c3VhbHkgYW55d2F5KS5cblx0ICpcblx0ICogT3B0aW9uIGZvciByZWR1Y2UgdGhlIG51bWJlciBvZiByZXF1ZXN0cywgYnV0IGl0IGNhbiBtYWtlIGFydGVmYWN0cyBpbiB0cmFuc2xhdGVkIHRleHQuXG5cdCAqXG5cdCAqIFNvbWUgbW9kdWxlcyBtYXkgbm90IHN1cHBvcnQgdGhpcyBmZWF0dXJlLlxuXHQgKi9cblx0dXNlTXVsdGlwbGV4aW5nPzogYm9vbGVhbjtcblxuXHQvKipcblx0ICogQWRkaXRpb25hbCBoZWFkZXJzIGZvciByZXF1ZXN0c1xuXHQgKi9cblx0aGVhZGVycz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG5cblx0LyoqXG5cdCAqIFByb3h5IHByZWZpeCBvciB0cmFuc2Zvcm0gZnVuY3Rpb24gd2hpY2ggcmV0dXJuIHVybCB3aXRoIENPUlMgcHJveHlcblx0ICpcblx0ICogQ09SUyBwcm94eSB1c2VmdWwgdG8gYXZvaWQgQ09SUyBlcnJvciBpbiBicm93c2VyIG9yIHRvIG1hc2sgc2VydmVyIHJlcXVlc3RzIGFzIGJyb3dzZXIgcmVxdWVzdHMuXG5cdCAqXG5cdCAqIEFsbCByZXF1ZXN0cyB3aWxsIHNlbmQgdGhyb3VnaCB0aGlzIHByb3h5IHNlcnZlciBhbmQgdGhpcyBzZXJ2ZXIgd2lsbCBtb2RpZnkgaGVhZGVyc1xuXHQgKi9cblx0Y29yc1Byb3h5PzogQ29yc1Byb3h5O1xufVxuXG4vKipcbiAqIEJhc2ljIGFic3RyYWN0IGNsYXNzIGZvciB0cmFuc2xhdG9yXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCYXNlVHJhbnNsYXRvcjxDIGV4dGVuZHMgUmVjb3JkPGFueSwgYW55PiA9IHt9PlxuaW1wbGVtZW50cyBUcmFuc2xhdG9ySW5zdGFuY2VNZW1iZXJzXG57XG5cdHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgdHJhbnNsYXRvck5hbWU6IHN0cmluZyA9ICdVbmtub3duVHJhbnNsYXRvcic7XG5cblx0cHVibGljIHN0YXRpYyBpc1JlcXVpcmVkS2V5ID0gKCkgPT4gZmFsc2U7XG5cblx0cHVibGljIHN0YXRpYyBpc1N1cHBvcnRlZEF1dG9Gcm9tID0gKCkgPT4gZmFsc2U7XG5cblx0cHVibGljIHN0YXRpYyBnZXRTdXBwb3J0ZWRMYW5ndWFnZXMgPSAoKTogbGFuZ0NvZGVbXSA9PiBbXTtcblxuXHRwdWJsaWMgYWJzdHJhY3QgZ2V0TGVuZ3RoTGltaXQoKTogbnVtYmVyO1xuXG5cdHB1YmxpYyBhYnN0cmFjdCBnZXRSZXF1ZXN0c1RpbWVvdXQoKTogbnVtYmVyO1xuXG5cdHByb3RlY3RlZCByZWFkb25seSBvcHRpb25zOiBUcmFuc2xhdG9yT3B0aW9ucyAmIEMgPSB7fSBhcyBhbnk7XG5cdGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBUcmFuc2xhdG9yT3B0aW9ucyAmIEMpIHtcblx0XHRpZiAob3B0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXHRcdH1cblx0fVxuXG5cdGFic3RyYWN0IHRyYW5zbGF0ZShcblx0XHR0ZXh0OiBzdHJpbmcsXG5cdFx0bGFuZ0Zyb206IGxhbmdDb2RlV2l0aEF1dG8sXG5cdFx0bGFuZ1RvOiBsYW5nQ29kZSxcblx0KTogUHJvbWlzZTxzdHJpbmc+O1xuXG5cdGFic3RyYWN0IHRyYW5zbGF0ZUJhdGNoKFxuXHRcdHRleHQ6IHN0cmluZ1tdLFxuXHRcdGxhbmdGcm9tOiBsYW5nQ29kZVdpdGhBdXRvLFxuXHRcdGxhbmdUbzogbGFuZ0NvZGUsXG5cdCk6IFByb21pc2U8QXJyYXk8c3RyaW5nIHwgbnVsbD4+O1xuXG5cdHB1YmxpYyBjaGVja0xpbWl0RXhjZWVkaW5nKHRleHQ6IHN0cmluZyB8IHN0cmluZ1tdKSB7XG5cdFx0Y29uc3QgcGxhaW5UZXh0ID0gQXJyYXkuaXNBcnJheSh0ZXh0KSA/IHRleHQuam9pbignJykgOiB0ZXh0O1xuXHRcdGNvbnN0IGV4dHJhID0gcGxhaW5UZXh0Lmxlbmd0aCAtIHRoaXMuZ2V0TGVuZ3RoTGltaXQoKTtcblx0XHRyZXR1cm4gZXh0cmEgPiAwID8gZXh0cmEgOiAwO1xuXHR9XG5cblx0LyoqXG5cdCAqIFV0aWwgdG8gd3JhcCB1cmwgdG8gQ09SUyBwcm94eVxuXHQgKi9cblx0cHJvdGVjdGVkIHdyYXBVcmxUb0NvcnNQcm94eSA9ICh1cmw6IHN0cmluZykgPT4ge1xuXHRcdC8vIFVzZSBhcyBwcmVmaXhcblx0XHRpZiAodHlwZW9mIHRoaXMub3B0aW9ucy5jb3JzUHJveHkgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5vcHRpb25zLmNvcnNQcm94eSArIHVybDtcblx0XHR9XG5cblx0XHQvLyBSdW4gdXNlciBkZWZpbmVkIHRyYW5zZm9ybWF0aW9uXG5cdFx0aWYgKHR5cGVvZiB0aGlzLm9wdGlvbnMuY29yc1Byb3h5ID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5vcHRpb25zLmNvcnNQcm94eSh1cmwpO1xuXHRcdH1cblxuXHRcdHJldHVybiB1cmw7XG5cdH07XG59XG4iXSwiZmlsZSI6InR5cGVzL1RyYW5zbGF0b3IuanMifQ==


/***/ }),

/***/ 812:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);
var defaults = __webpack_require__(190);

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  var context = this || defaults;
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn.call(context, data, headers);
  });

  return data;
};


/***/ }),

/***/ 822:
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

__webpack_require__(437).config();
const core = __webpack_require__(186);

const { getLunsjkollektivetMenu } = __webpack_require__(117);
const { assembleMenuMessage, sendSlackMessage } = __webpack_require__(568);

async function main() {
	try {
		// Action inputs
		// Required
		const slackWebhook = core.getInput('slack_webhook', { required: true });
		const slackChannel = core.getInput('slack_channel', { required: true });
		const slackAuthor = core.getInput('slack_author', { required: true });

		/**
		 * Get the menu from Lunsjkollektivet
		 */
		core.startGroup('Started initialization');
		core.info('Getting menu from Lunsjkollektivet');
		const menu = await getLunsjkollektivetMenu();
		if (menu.length === 0) {
			core.setFailed('No menu found');
			return;
		}
		core.endGroup();

		/**
		 * Assemble the message for Slack and send it
		 */
		core.startGroup('Started assembling message');
		const blocks = assembleMenuMessage(menu);
		console.log(blocks);
		core.info('Assembled message');
		await sendSlackMessage(slackWebhook, slackChannel, slackAuthor, blocks);
		core.info(`Sent message to Slack channel ${slackChannel}`);
		core.endGroup();
	} catch (error) {
		core.setFailed(`Action failed because of: ${error}`);
	}
}

main();


/***/ }),

/***/ 831:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(328);

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
module.exports = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  function getMergedValue(target, source) {
    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
      return utils.merge(target, source);
    } else if (utils.isPlainObject(source)) {
      return utils.merge({}, source);
    } else if (utils.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  // eslint-disable-next-line consistent-return
  function mergeDeepProperties(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(prop) {
    if (prop in config2) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (prop in config1) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  var mergeMap = {
    'url': valueFromConfig2,
    'method': valueFromConfig2,
    'data': valueFromConfig2,
    'baseURL': defaultToConfig2,
    'transformRequest': defaultToConfig2,
    'transformResponse': defaultToConfig2,
    'paramsSerializer': defaultToConfig2,
    'timeout': defaultToConfig2,
    'timeoutMessage': defaultToConfig2,
    'withCredentials': defaultToConfig2,
    'adapter': defaultToConfig2,
    'responseType': defaultToConfig2,
    'xsrfCookieName': defaultToConfig2,
    'xsrfHeaderName': defaultToConfig2,
    'onUploadProgress': defaultToConfig2,
    'onDownloadProgress': defaultToConfig2,
    'decompress': defaultToConfig2,
    'maxContentLength': defaultToConfig2,
    'maxBodyLength': defaultToConfig2,
    'transport': defaultToConfig2,
    'httpAgent': defaultToConfig2,
    'httpsAgent': defaultToConfig2,
    'cancelToken': defaultToConfig2,
    'socketPath': defaultToConfig2,
    'responseEncoding': defaultToConfig2,
    'validateStatus': mergeDirectKeys
  };

  utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
    var merge = mergeMap[prop] || mergeDeepProperties;
    var configValue = merge(prop);
    (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  });

  return config;
};


/***/ }),

/***/ 835:
/***/ (function(module) {

module.exports = require("url");

/***/ }),

/***/ 850:
/***/ (function(module) {

"use strict";


/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};


/***/ }),

/***/ 867:
/***/ (function(module) {

module.exports = require("tty");

/***/ }),

/***/ 875:
/***/ (function(module) {

"use strict";


/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;


/***/ }),

/***/ 877:
/***/ (function(module) {

module.exports = eval("require")("encoding");


/***/ }),

/***/ 878:
/***/ (function(module) {

"use strict";


module.exports = (string, separator) => {
	if (!(typeof string === 'string' && typeof separator === 'string')) {
		throw new TypeError('Expected the arguments to be of type `string`');
	}

	if (separator === '') {
		return [string];
	}

	const separatorIndex = string.indexOf(separator);

	if (separatorIndex === -1) {
		return [string];
	}

	return [
		string.slice(0, separatorIndex),
		string.slice(separatorIndex + separator.length)
	];
};


/***/ }),

/***/ 900:
/***/ (function(module) {

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isFinite(val)) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (msAbs >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (msAbs >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (msAbs >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }
  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }
  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }
  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }
  return ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
}


/***/ }),

/***/ 918:
/***/ (function(module) {

/**
 * Get the next business day and date as an object.
 * The day is returned as a string and date as a YYYY-MM-DD.
 * Skips the weekends.
 *
 * @returns  {Object}
 */
function getNextBusinessDay() {
	const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
	const day = date.getDay();
	const dayOffset = day === 0 ? 1 : day === 6 ? 2 : day;
	date.setDate(date.getDate() + dayOffset);
	return {
		day: date.toLocaleDateString('en-US', { weekday: 'long' }),
		date: date.toISOString().split('T')[0],
	};
}

/**
 * Remove newline break from the end of a string.
 *
 * @param {String} str
 * @returns {String}
 */
function stripEndingNewlineBreaks(str) {
	if (str.charAt(str.length - 1) === '\n') {
		str = str.slice(0, -1);
	}
	return str;
}

/**
 * Get a random greeting.
 *
 * @returns {String}
 */
function getGreeting() {
	const greetings = [
		'Good morning!',
		'Get ready for lunch!',
		'Lunch time!',
		"Hope you're hungry!",
		'Time for lunch!',
	];
	const rand = Math.floor(Math.random() * greetings.length);
	return greetings[rand];
}

module.exports = { getNextBusinessDay, stripEndingNewlineBreaks, getGreeting };


/***/ }),

/***/ 934:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var isAbsoluteURL = __webpack_require__(301);
var combineURLs = __webpack_require__(189);

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 * @returns {string} The combined full path
 */
module.exports = function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
};


/***/ }),

/***/ 940:
/***/ (function(module) {

"use strict";

module.exports = function (obj, predicate) {
	var ret = {};
	var keys = Object.keys(obj);
	var isArr = Array.isArray(predicate);

	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		var val = obj[key];

		if (isArr ? predicate.indexOf(key) !== -1 : predicate(key, val, obj)) {
			ret[key] = val;
		}
	}

	return ret;
};


/***/ }),

/***/ 983:
/***/ (function(__unusedmodule, exports) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deepExploreArray = deepExploreArray;

function deepExploreArray(obj, depth) {
  var currentDepth = 0;
  var currentObj = obj;

  while (depth > currentDepth) {
    if (!Array.isArray(currentObj)) {
      throw new TypeError('Error while explore array on depth #' + currentDepth);
    }

    currentObj = currentObj[0];
    currentDepth++;
  }

  return currentObj;
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRyYW5zbGF0b3JzL0dvb2dsZVRyYW5zbGF0b3IvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFNLFNBQVUsZ0JBQVYsQ0FBMkIsR0FBM0IsRUFBeUMsS0FBekMsRUFBc0Q7QUFDM0QsTUFBSSxZQUFZLEdBQUcsQ0FBbkI7QUFDQSxNQUFJLFVBQVUsR0FBRyxHQUFqQjs7QUFDQSxTQUFPLEtBQUssR0FBRyxZQUFmLEVBQTZCO0FBQzVCLFFBQUksQ0FBQyxLQUFLLENBQUMsT0FBTixDQUFjLFVBQWQsQ0FBTCxFQUFnQztBQUMvQixZQUFNLElBQUksU0FBSixDQUFjLHlDQUF5QyxZQUF2RCxDQUFOO0FBQ0E7O0FBRUQsSUFBQSxVQUFVLEdBQUcsVUFBVSxDQUFDLENBQUQsQ0FBdkI7QUFDQSxJQUFBLFlBQVk7QUFDWjs7QUFFRCxTQUFPLFVBQVA7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWVwRXhwbG9yZUFycmF5KG9iajogdW5rbm93biwgZGVwdGg6IG51bWJlcikge1xuXHRsZXQgY3VycmVudERlcHRoID0gMDtcblx0bGV0IGN1cnJlbnRPYmogPSBvYmo7XG5cdHdoaWxlIChkZXB0aCA+IGN1cnJlbnREZXB0aCkge1xuXHRcdGlmICghQXJyYXkuaXNBcnJheShjdXJyZW50T2JqKSkge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignRXJyb3Igd2hpbGUgZXhwbG9yZSBhcnJheSBvbiBkZXB0aCAjJyArIGN1cnJlbnREZXB0aCk7XG5cdFx0fVxuXG5cdFx0Y3VycmVudE9iaiA9IGN1cnJlbnRPYmpbMF07XG5cdFx0Y3VycmVudERlcHRoKys7XG5cdH1cblxuXHRyZXR1cm4gY3VycmVudE9iajtcbn1cbiJdLCJmaWxlIjoidHJhbnNsYXRvcnMvR29vZ2xlVHJhbnNsYXRvci91dGlscy5qcyJ9


/***/ })

/******/ });