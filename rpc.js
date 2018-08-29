/*
 * Name:    JSON RPC server library
 * Version: 1.0.0
 * Author:  Renze Nicolai 2018
 * License: GPLv3
 */

"use strict";

class Rpc {
	constructor( opts ) {
		this._opts = Object.assign({
			strict: true,
			auth: null,
			debug: false
		}, opts);
		
		this._functions = {};
	}
	
	addMethod(name, func) {
		if (name && typeof func === 'function') {
			this._functions[name] = func;
			if (this._opts.debug) console.log("[RPC] Registered method '"+name+"'");
			return true;
		}
		if (this._opts.debug) console.log("[RPC] Can not register method '"+name+"'");
		return false;
	}
	
	delMethod(name) {
		if (this._functions[name]) {
			this._functions[name] = null;
			return true;
		}
		return false;
	}
	
	listMethods() {
		var list = [];
		for (var i in this._functions) {
			list.push(i);
		}
		return list;
	}
	
	_handleRequest(request) {		
		return new Promise((resolve, reject) => {
			var response = {};

			if (request.id) response.id = request.id;
			
			if (this._opts.strict) {
				if (!request.id) response.id = null;
				response.jsonrpc = "2.0";
				
				if ((request.jsonrpc !== "2.0") || (!request.id)) {
					response.error = { code: -32600, message: "Invalid Request" };
					if (this._opts.debug) console.log("_handleRequest: reject strict!",request,"response:",response);
					return reject(response);
				}
			}
			
			if (typeof request.params === 'undefined') request.params = null;
			if (typeof request.token !== 'string') request.token = "";
						   
						
			if (typeof request.method === 'string') {
				if (this._opts.debug) console.log("[RPC] Request:",request.method,request.params);
				
				//Authentication and session management
				var session = null;
				
				if (this._opts.auth !== null) {
					if (typeof request.token === 'string') {
						session = this._opts.auth.getSession(request.token);
					}
					var havePermission = this._opts.auth.checkAlwaysAllow(request.method);
					if (!havePermission && (session !== null)) havePermission = session.checkPermissionSync(request.method);
					if (!havePermission) {
							response.error = { code: 1, message: "Access denied" };
							if (this._opts.debug) console.log("[RPC] Access denied");
							return reject(response);
					}
				}
				
				if (typeof this._functions[request.method] === 'function') {
					var numArgs = this._functions[request.method].length;
					if (this._opts.debug) console.log("method",request.method,"args",numArgs);
					
					if (numArgs===3) {
						this._functions[request.method](session, request.params, (err,res) => {
							if (err) {
								response.error = err;
								if (this._opts.debug) console.log("[RPC] Response (failure)",err);
							}
							if (res) {
								response.result = res;
								if (this._opts.debug) console.log("[RPC] Response (success)",res);
								return resolve(response);
							}
							return reject(response);
						});
					} else if (numArgs===2) {
						this._functions[request.method](session, request.params).then( (res) => {
							response.result = res;
							if (this._opts.debug) console.log("[RPC] Response (success)",res);
							return resolve(response);
						}).catch( (err) => {
							response.error = err;
							if (this._opts.debug) console.log("[RPC] Response (failure)",err);
							return reject(response);
						});
					} else if (numArgs===1) {
						this._functions[request.method](request.params).then( (res) => {
							response.result = res;
							if (this._opts.debug) console.log("[RPC] Response (success)",res);
							return resolve(response);
						}).catch( (err) => {
							response.error = err;
							if (this._opts.debug) console.log("[RPC] Response (failure)",err);
							return reject(response);
						});
					} else {
						if (this._opts.debug) console.log("[RPC] Error: method '"+request.method+"' has an invalid argument count!",numArgs);
						throw "Method has invalid argument count";
					}
				} else {
					if (this._opts.debug) console.log("[RPC] Error: method not found");
					response.error = { code: -32601, message: "Method not found" };
					return reject(response);
				}
			} else {
				if (this._opts.debug) console.log("[RPC] Error: invalid request");
				response.error = { code: -32600, message: "Invalid Request" };
				return reject(response);
			}
		});
	}
	
	handle(data) {
		return new Promise((resolve, reject) => {
			var requests = null;

			try {
				requests = JSON.parse(data);
			} catch (err) {
				if (this._opts.debug) console.log(data, err);
				return reject(JSON.stringify({ code: -32700, message: "Parse error" }));
			}
			
			if (!Array.isArray(requests)) {
				requests = [requests];
			}
			
			if (requests.length < 1) {
				return reject(JSON.stringify({ code: -32600, message: "Invalid Request" }));
			}

			if (requests.length > 1) {
				//A batch of requests
				
				var promises = [];
				var results = [];
				var failed = false;
				
				for (var index = 0; index<requests.length; index++) {
					promises.push(this._handleRequest(requests[index]).then( (result) => {
						results.push(result);
					}).catch( (error) => {
						results.push(error);
						failed = true;
					}));
				}
				
				Promise.all(promises).then( (unused) => {
					if (failed) {
						return reject(JSON.stringify(results));
					} else {
						return resolve(JSON.stringify(results));
					}
				});
			} else {
				//A single request
				
				this._handleRequest(requests[0]).then( (result) => {
					return resolve(JSON.stringify(result));
				}).catch( (error) => {
					return reject(JSON.stringify(error));
				});
			}
		});
	}
}

module.exports = Rpc;
