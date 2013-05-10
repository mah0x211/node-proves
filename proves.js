/*
 *  proves.js
 *
 *  Created by Masatoshi Teruya on 13/05/10.
 *  Copyright 2013 Masatoshi Teruya. All rights reserved.
 *
 */
"use strict";
// dependencies
var fs = require('fs'),
    path = require('path');

// @src:begin
function init_proves(){
// constants
var RE_EMAIL = undefined,
    RE_EMAIL_LOOSE = undefined,
    RE_URL = undefined,
    URL_PART = {
        INPUT: 0,
        SCHEME: 1,
        HOSTNAME: 2,
        PORT: 3,
        PATH: 4,
        QUERY: 5,
        FRAGMENT: 6
    };


function init_regexp_email()
{
    // EMAIL REGEXP
    // ATOM: a-z A-Z 0-9 ! # $ % & ' * + - / = ? ^ _ ` { | } ~
    var atext = "[-a-zA-Z0-9!#$%&'*+/=?^_`{|}~]",
        dot_atom = "(?:" + atext + "+(?:\\." + atext + "+)*)",
        dot_atom_loose = "(?:" + atext + "+(?:\\.|" + atext + ")*)",
        qtext = "(?:\"(?:\\[^\\r\\n]|[^\\\"])*\")",
        local_part = "(?:" + dot_atom + "|" + qtext + ")",
        local_part_loose = "(?:" + dot_atom_loose + "|" + qtext + ")",
        /*
        [\x21-\x5a\x5e-\x7e]
        \x21-\x2f = [!"#$%&'()*+,=./]
        \x30-\x39 = [0-9]
        \x3a-\x40 = [:;<=>?@]
        \x41-\x5a = [A-Z]
        \x5e-\x60 = [^_`]
        \x61-\x7a = [a-z]
        \x7b-\x7e = [{|}~]
        */
        domain_lit = "\\[(?:\\S|[\x21-\x5a\x5e-\x7e])*\\]",
        domain_part = "(?:" + dot_atom + "|" + domain_lit + ")",
        valid = "^(?:" + local_part + "@" + domain_part + ")$",
        loose = "^(?:" + local_part_loose + "@" + domain_part + ")$";
        
    RE_EMAIL = new RegExp( valid );
    RE_EMAIL_LOOSE = new RegExp( loose );
}

function init_regexp_url()
{
    // URL REGEXP(not include userinfo)
    // [input,scheme,hostname,port,path,query,fragment]
        // scheme
    var scheme = "(https?)://",
        // host name
        domain_label = "[a-z0-9](?:[-a-z0-9]*[a-z0-9])?",
        top_label = "[a-z](?:[-a-z0-9]*[a-z0-9])?",
        hostname = "(?:" + domain_label + "\\.)*" + top_label + "\\.?",
        // IPv4
        ipv4addr = "(?:[0-9]+[.][0-9]+[.][0-9]+[.][0-9]+)",
        // host
        host = "(" + hostname + "|" + ipv4addr + ")",
        // port
        port = "(?::([0-9]*))?",
        // path_segments
        param = "(?:[-_.!~*'()a-z0-9:@&=+$,]|%[0-9a-f][0-9a-f])",
        segment = param + "*(?:;" + param + ")*",
        path_segments = "(/" + segment + "(?:/" + segment + ")*)?",
        // [ reserved[;:@&=+$,]| unreserved[a-zA-Z0-9] | mark[\/-_.!~*'()]] | escaped
        uric = "(?:[;:@&=+$,?a-z0-9/\\_.!~*'()-]|%[0-9a-f][0-9a-f])*",
        uris = "(?:(?:[;:@&=+$,?a-z0-9/\\_.!~*'()-]+|%[0-9a-f][0-9a-f])*)",
        // query
        query = "(\\?" + uris + ")?",
        // fragment
        fragment = "(#" + uris + ")?",
        // absolute uri
        absolute_uri = scheme + host + port + path_segments + query,
        // uri reference
        uri_reference = absolute_uri + fragment;

    RE_URL = new RegExp( "\\b" + uri_reference, 'i' );
}
init_regexp_email();
init_regexp_url();

function getKeyVal( obj, keys )
{
    var prev = obj,
        val;
    
    if( typeof keys === 'string' ){
        keys = keys.split('.');
    }
    else if( !( keys instanceof Array ) ){
        throw new TypeError('invalid keys');
    }
    
    for( var idx = 0, len = keys.length; idx < len; idx++ )
    {
        val = prev[keys[idx].trim()];
        if( !val ){
            return undefined;
        }
        prev = val;
    }
    
    return val;
}

function setKeyVal( obj, keys, val )
{
    var prev = obj,
        next;
    
    if( typeof keys === 'string' ){
        keys = keys.split('.');
    }
    else if( !( keys instanceof Array ) ){
        throw new TypeError('invalid keys');
    }
    
    for( var idx = 0, len = keys.length; idx < len; idx++ )
    {
        if( len - idx === 1 ){
            prev[keys[idx]] = val;
            break;
        }
        
        next = prev[keys[idx]];
        if( !next )
        {
            next = {};
            prev[keys[idx]] = next;
            idx++;
            len--;
            for(; idx < len; idx++ ){
                prev = {};
                next[keys[idx]] = prev;
                next = prev;
            }
            next[keys[idx]] = val;
            break;
        }
        prev = next;
    }
}

function isBool( arg )
{
    var argc = arguments.length;
    
    if( argc < 2 ){
        return typeof arg === 'boolean';
    }
    else if( typeof arguments[0] === 'object' )
    {
        arg = getKeyVal( arguments[0], arguments[1] );
        if( typeof arg !== 'boolean' ){
            return false;
        }
        
        return ( argc < 3 || ( arg === arguments[2] ) );
    }
    
    return ( typeof arg === 'boolean' && arg === arguments[1] );
}

function isString( arg )
{
    var argc = arguments.length;
    
    if( argc < 2 ){
        return typeof arg === 'string';
    }
    else if( typeof arguments[0] === 'object' )
    {
        arg = getKeyVal( arguments[0], arguments[1] );
        if( typeof arg !== 'string' ){
            return false;
        }
        
        return ( argc < 3 || arg === arguments[2] );
    
    }
    
    return ( typeof arg === 'string' && arg === arguments[1] );
}

function isNumber( arg )
{
    var argc = arguments.length;
    
    if( argc < 2 ){
        return isFinite( arg );
    }
    else if( typeof arguments[0] === 'object' )
    {
        arg = getKeyVal( arguments[0], arguments[1] );
        if( !isFinite( arg ) ){
            return false;
        }
        
        return ( argc < 3 || arg === arguments[2] );
    }
    
    return ( isFinite( arg ) && arg === arguments[1] );
}

function isFunction( arg )
{
    return 'function' === typeof(
        arguments.length < 2 ? arg :
        getKeyVal( arguments[0], arguments[1] )
    );
}

function isObject( arg )
{
    arg = arguments.length < 2 ? arg :
          getKeyVal( arguments[0], arguments[1] );

    return ( arg && ( arg.constructor === Object || typeof arg === 'object' ) );
}

function isArray( arg )
{
    arg = arguments.length < 2 ? arg :
          getKeyVal( arguments[0], arguments[1] );
    
    return ( arg && arg.constructor === Array );
}

function isDate( arg )
{
    arg = arguments.length < 2 ? arg :
          getKeyVal( arguments[0], arguments[1] );
    
    return ( arg && arg.constructor === Date );
}

function isRegExp( arg )
{
    arg = arguments.length < 2 ? arg :
          getKeyVal( arguments[0], arguments[1] );
    
    return ( arg && arg.constructor === RegExp );
}

function isEmail( arg )
{
    arg = arguments.length < 2 ? arg :
          getKeyVal( arguments[0], arguments[1] );

    return ( typeof arg === 'string' && RE_EMAIL.test( arg ) );
}

function isEmailLoose( arg )
{
    arg = arguments.length < 2 ? arg :
          getKeyVal( arguments[0], arguments[1] );

    return ( typeof arg === 'string' && RE_EMAIL_LOOSE.test( arg ) );
}

function isURL( arg )
{
    var argc = arguments.length;
    
    if( argc < 2 ){
        return ( typeof arg === 'string' && RE_URL.test( arg ) );
    }
    
    arg = getKeyVal( arguments[0], arguments[1] );
    if( typeof arg !== 'string' ){
        return false;
    }
    else if( argc < 3 ){
        return RE_URL.test( arg );
    }
    else
    {
        var url = RE_URL.exec( arg );
        
        if( url )
        {
            var hostname = ( url[URL_PART.HOSTNAME] ) ? 
                            url[URL_PART.HOSTNAME].split('.') :
                            [],
                port = +( url[URL_PART.PORT] || 0 );
        
            if( url[URL_PART.SCHEME] && 
                hostname.length >= 2 &&
                port >= 0 && port <= 65535 ){
                return ( arguments[2] ) ? url : true;
            }
        }
    }
    
    return false;
}

function isExists( arg )
{
    if( arguments.length < 2 ){
        arg = path.resolve( path.normalize( arg ) );
        return fs.existsSync( arg ) ? arg : false;
    }
    else
    {
        var cb = arguments[1];
        
        arg = path.resolve( path.normalize( arg ) );
        fs.exists( arg, function(isa){
            cb( isa ? arg : false );
        });
    }
}

function isDir( arg )
{
    if( arguments.length < 2 ){
        arg = isExists( arg );
        return ( arg && fs.statSync( arg ).isDirectory() && arg );
    }
    else
    {
        var cb = arguments[1];
        
        isExists( arg, function( isa )
        {
            if( isa ){
                fs.stat( isa, function( err, stat ){
                    cb( err, stat && stat.isDirectory() && isa );
                });
            }
            else {
                cb( undefined, false );
            }
        });
    }
}


function isFile( arg )
{
    if( arguments.length < 2 ){
        arg = isExists( arg );
        return ( arg && fs.statSync( arg ).isFile() && arg );
    }
    else
    {
        var cb = arguments[1];
        
        isExists( arg, function( isa )
        {
            if( isa ){
                fs.stat( isa, function( err, stat ){
                    cb( err, stat && stat.isFile() && isa );
                });
            }
            else {
                cb( undefined, false );
            }
        });
    }
}

return {
    get: getKeyVal,
    set: setKeyVal,
    is: {
        bool: isBool,
        str: isString,
        num: isNumber,
        func: isFunction,
        obj: isObject,
        arr: isArray,
        date: isDate,
        regexp: isRegExp,
        email: isEmail,
        emailLoose: isEmailLoose,
        exists: isExists,
        file: isFile,
        dir: isDir
    }
};

}

// @src:end
// @var:PROVES

module.exports = init_proves();

