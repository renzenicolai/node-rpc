# rn-rpc
A simple JSON RPC server implementation for Node.js

# Usage
First you have to install the 'rn-rpc' package into your project directory using NPM:
``` npm i rn-rpc ```

The module can then be used by creating an instance of the module:

```
var rpc = new Rpc({
		strict: true
	});
```

Your front-end server can then execute an RPC call by sending the full request body to the `handle(body)` function of the `rpc` instance.

To add methods to your RPC api simply call the `addMethod(method, function)` function of the `rpc` instance.

The `method` parameter tells the RPC library what the endpoint of your function should be, while the `function` argument is the handler function for the method you are creating.

### A function using promises

```
exampleFunction(params) {
	return new Promise((resolve, reject) = {
		return resolve("I did nothing, succesfully!");
	}
}
```

```
exampleFunction(params) {
	return new Promise((resolve, reject) = {
		return reject("I failed while doing nothing!");
	}
}
```

### A function using a callback
```
exampleFunction(params, callback) {
	return callback(null, "I did nothing, succesfully!");
}
```

```
exampleFunction(params, callback) {
	return callback("I failed while doing nothing!", null);
}
```

# Using authentication
Authentication can be added to the RPC handler by providing an object as the `auth` parameter while constructing the RPC instance.

The `auth` object has to implement the following methods:

### checkAlwaysAllow(method)
This function should return either `true` or `false`. If the function returns `true` then the request is allowed, weither or not a valid session is available.

### getSession(token)
Dependent on the provided token string this function should return either `null` or a `Session` object, as described below.

## The session object
The session object has to implement the following methods:

### checkPermissionSync(method)
This function should return either `true` or `false`. If the function returns `true` then the request is allowed, weither or not a valid session is available.
