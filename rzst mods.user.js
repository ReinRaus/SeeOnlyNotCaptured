// ==UserScript==
// @name         rzst mods
// @namespace    https://rzst.io
// @version      1.0.1
// @description  Now you see me
// @author       ReinRaus
// @updateURL    https://github.com/ReinRaus/SeeOnlyNotCaptured/raw/master/rzst_mods.user.js
// @match        https://rzst.io/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

var getChanges = function ( pageHTML ) {
    var regexChangedFull = /\bportal changes:[^]*?<table>/i;
    var regexChangedOne = /[-+.0-9]+,[-+.0-9]+(?=,)/img;
    var textChangesFull = pageHTML.match( regexChangedFull );
    if ( textChangesFull ) {
        var textChanges = textChangesFull[0].match( regexChangedOne );
        if ( textChanges ) return textChanges;
    }
    return [];
};

var requestPull = getChanges( document.body.innerHTML );
requests = {};
var pullPointer = 0;
while ( pullPointer < requestPull.length ) {
    var coords = requestPull[ pullPointer ];
    $.ajax( {
        url: "https://rzst.io/stats/?ll="+coords,
        type: "GET",
        async: false,
        success: (data)=>{
            requests[coords] = data.replace( /^[^]*?(<table>)|(<\/table>)(?:[^](?!<\/table>))*?$/ig, "$1$2" );
            var newPull = getChanges( data );
            newPull.forEach( item=> requestPull.includes(item)?null:requestPull.push( item ) );
        }
    } );
    pullPointer++;
}

Object.keys( requests ).map( key=> $(requests[key]).find( "td[valign='top'] table tbody" ).each( (k,v)=>$("table td[valign='top'] table")[k].append( v ) ) );

$("table td[valign='top'] table").each( (index,table)=> {
    var map_time_td = {};
    $( table ).find( "td" ).each( (index2, td)=> {
        map_time_td[ Date.parse( td.innerHTML.match( /\slast:\s([^]+?)\s</i )[1] ) ] = td;
    } );
    var sortedKeys = Object.keys( map_time_td ).map( n=>parseInt(n) ).sort().reverse();
    sortedKeys.forEach( key=>$( map_time_td[key] ).parent().insertAfter( $(table).find( "tr:last") ));
} );