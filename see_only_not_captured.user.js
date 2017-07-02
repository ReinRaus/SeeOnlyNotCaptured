// ==UserScript==
// @name         See only not captured portals
// @namespace    https://upor.in/caps/
// @version      1.0.4
// @description  Now you see me
// @author       ReinRaus
// @updateURL    https://github.com/ReinRaus/SeeOnlyNotCaptured/raw/master/see_only_not_captured.user.js
// @match        https://upor.in/caps/*
// @grant        none
// @run-at       document-body
// ==/UserScript==

// запускается после head, но перед body
(function() {
    'use strict';
    window.zoomNC = 13;
    window.showOnlyNC = false;
    var regex = /[-+]?\d+\.?\d*([eE][-+]?\d+)?(?=px)/g; // https://regex101.com/r/St6vjr/1
    
    window.NCisNeedRunning = function( run ) {
        selectMedalImg( run ? "onyx" : "gold" );
        if ( !run ) uGeo.callback( [] );
        if ( run && map.hasLayer( window.markers ) ) map.removeLayer( window.markers );
        if ( !run && !map.hasLayer( window.markers ) ) map.addLayer( window.markers );
        document.getElementById( 'NCbutExpText' ).disabled = !run;
    };
    
    window.onZoomNC = function() {
        if ( window.showOnlyNC ) {
            if ( map.getZoom() < zoomNC ) {
                NCisNeedRunning( false );
            } else {
                NCisNeedRunning( true );
            }
        }
    };
    
    window.NCloadStorage = function(){
        try {
            window.NCstorage = JSON.parse( localStorage["NCstorage"] );
        } catch(e) {
            window.NCstorage = [];
        }
        var div = document.getElementById( "NCsavedView" );
        if ( div ) {
            var html = "";
            for ( var i in NCstorage ) {
                html+= `<div><b>${i*1+1}</b> <a href='#' onclick='NCloadView(${i});'>load</a> <a href='#' onclick='NCdeleteView(${i});' style='float:right'>delete</a></div>`;
            }
            div.innerHTML = html;
        }
    };
    
    window.NCsaveStorage = function() {
        localStorage["NCstorage"] = JSON.stringify( NCstorage );
        NCloadStorage();
    };
    
    window.NCsaveView = function( ) {
        var result = {};
        result.center = map.getCenter();
        result.zoom = map.getZoom();
        result.labels = {};
        Array.prototype.slice.call(document.getElementsByClassName( "dragLabels" )).forEach( item=>{
            var m = item.style.transform.match( regex );
            result.labels[ item.innerText ] = [ m[0], m[1] ];
        } );
        NCstorage.push( result );
        NCsaveStorage();
    };
    
    window.NCdeleteView = function( i ) {
        if ( NCstorage[i] ) {
            NCstorage.splice( i, 1 );
            NCsaveStorage();
        }
    };
    
    window.NCloadView = function( i ) {
        if ( NCstorage[i] ) {
            map.on( "zoomend", function zoomEndListener() {
                if ( !window.showOnlyNC ) onShowNCChange();
                var oldCallback = uGeo.callback;
                uGeo.callback = function( data ) {
                    oldCallback.call( uGeo, data );
                    uGeo.callback = oldCallback;
                    NCexport( new Event( "xxx" ) );
                    var labels = document.getElementsByClassName( "dragLabels" );
                    for ( var j=0; j<labels.length; j++ ) {
                        if ( labels[j].innerText in NCstorage[i].labels ){
                            var coords = NCstorage[i].labels[labels[j].innerText];
                            var transform = `translate3d(${coords[0]}px,${coords[1]}px,0px)`;
                            labels[j].style.transform = transform;
                            labels[j].dragListener();
                        }
                    }
                };
                map.off( "zoomend", zoomEndListener );
            } );
            map.flyTo( [NCstorage[i].center.lat, NCstorage[i].center.lng], NCstorage[i].zoom );
        }
    };
    
    var loadURL = function(url) {
        var oRequest = new XMLHttpRequest();
        oRequest.open('GET', url, false);
        oRequest.send(null);
        return oRequest.responseText;
    };
    
    window.customFilter = function( item ){
        return !(item.geometry.coordinates[1]+"|"+item.geometry.coordinates[0] in prt);
    };
    
    window.NCexport = function(ev) {
        var layers = uGeo.getLayers();
        var map = document.getElementById( "map" );
        for ( var i in layers ) {
            var shift = map.children[0].style.transform.match( regex );
            var transform = layers[i]._icon.style.transform;
            var m = transform.match( regex );
            var x0 = parseFloat(m[0])+parseFloat(shift[0]); // marker X
            var y0 = parseFloat(m[1])+parseFloat(shift[1]); // marker Y
            
            var div = document.createElement( "div" );
            div.className = "dragLabels";
            div.innerHTML = "<HR noshade color=red style='position:absolute;width:10px;z-index:1999;transform:rotate(123deg);transform-origin: 0 0;' data-x0='"+(x0-6)+"' data-y0='"+(y0-15)+"' /><SPAN style='background-color:white;position:absolute;white-space:nowrap;z-index:2000'>"+layers[i].feature.properties.title+"</SPAN>";
            div.style = "z-index:2000;position:absolute;";
            
            L.DomUtil.setPosition( div, L.point( x0, y0-25 ) );
            var drag = new L.Draggable( div );
            var dragListener = ((element)=>{
                    var pos = element.style.transform.match( regex ); // массив крайней левой точки элемента
                    var hr = element.getElementsByTagName( 'hr' )[0];
                    var span = element.getElementsByTagName( 'span' )[0];
                    var width = span.getBoundingClientRect().width; // ширина подписи
                    var x0 = hr.dataset.x0*1; // х куда надо направить
                    var y0 = hr.dataset.y0*1; // у куда надо направить
                    pos[0] = pos[0]*1;
                    var shiftHr = 0;
                    var center  = pos[0] + width/2;
                    if ( center > x0 ) {
                        shiftHr = pos[0]>x0 ? 1 : (x0-pos[0])*2;
                    } else {
                        shiftHr = width-1;
                    }
                    pos[0] += shiftHr;
                    hr.style.left = shiftHr+"px";
                    var widthHr = Math.sqrt( Math.pow( pos[0]-x0, 2) + Math.pow( pos[1]-y0, 2) );
                    var rotate = Math.atan2( pos[1]-y0, pos[0]-x0 ) + Math.PI;
                    hr.style.transform = "rotate("+rotate+"rad";
                    hr.style.width = widthHr + "px";
                }).bind( null, div );
            drag.addEventListener( "drag", dragListener );
            drag.enable();
            div.dragListener = dragListener;
            document.body.appendChild( div );
            var hr = document.createElement( "hr" );
            hr.style="position:absolute;size:1px;width:100px;z-index:1999;color:red;";
        }
        ev.stopPropagation();
        document.getElementById( 'NCbutSaveView' ).disabled = false;
    };
    var style = document.createElement( "style" );
    style.innerHTML = ".NCbutton:hover div {display:block !important;}";
    document.body.appendChild( style );
    
    window.selectMedalImg = function( medal ) {
        if ( medal == "gold" ) document.getElementById( "showNCImg" ).src = "data:image/png;base64,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";
        else if ( medal == "onyx" ) document.getElementById( "showNCImg" ).src = "data:image/png;base64,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";
        else document.getElementById( "showNCImg" ).src = "data:image/png;base64,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";
    };
    
    // внедряемся в https://upor.in/js/leaflet.uGeoJSON.js
    var scr = loadURL( 'https://upor.in/js/leaflet.uGeoJSON.js' );
    scr = scr.replace( "self.callback(JSON.parse(this.responseText));", `//injected
         var resp = JSON.parse(this.responseText.replace( /&z=17&/g, "&z=16&" ) );
         var feat = resp.features;
         if ( showOnlyNC && feat ){
             resp.features = feat.filter( customFilter );
         };
         self.callback(resp);
         //end inject` );
    scr = scr.replace( "postData.append('zoom', this._map.getZoom());", "postData.append('zoom', ( this._map.getZoom()>="+window.zoomNC+" && showOnlyNC )? 16 : this._map.getZoom());" );
    var script = document.createElement( "script" );
    script.innerHTML = scr;
    document.head.appendChild( script ); // теперь будет работать измененный Layer
    
    window.onShowNCChange = function(){
        window.showOnlyNC = !window.showOnlyNC;
        if ( window.showOnlyNC && map.getZoom() >= zoomNC ) {
            NCisNeedRunning( true );
            uGeo.onMoveEnd();
        } else if ( window.showOnlyNC && map.getZoom() < zoomNC ) {
            NCisNeedRunning( false );
        } else {
            NCisNeedRunning( false );
            selectMedalImg( "bronze" );
        }
    };
    
    // исполняется после body
    document.addEventListener("DOMContentLoaded", function(){
        
        var convPortalsToFilter = function( portals ) {
            var result = {};
            for ( var i in portals ) result[ portals[i].lat+"|"+portals[i].lng ] = 0;
            return result;
        };
        window.prt = convPortalsToFilter( portals );

        L.Control.ShowNotCaptured = L.Control.extend({
            onAdd: function(map) {
                var html = L.DomUtil.create('div');
                html.innerHTML = "<div class='NCbutton'><div style='display:none;float:left; background:white; padding:3px;'><b>bronze</b> mod off<br/><b>gold</b> mod on, but small zoom <br/><b>onyx</b> mod on<br/><b>click</b> mod on/off<br/><button id='NCbutExpText' disabled>Show titles</button> <button id='NCbutSaveView' onclick='NCsaveView();' disabled>Save view</button><div id='NCsavedView'></div></div><img id='showNCImg' onclick='onShowNCChange();' width=48 height=48 /></div>";
                return html;
            },

            onRemove: function(map) {
                // Nothing to do here
            }
        });

        L.control.showNotCaptured = function(opts) {
            return new L.Control.ShowNotCaptured(opts);
        };

        L.control.showNotCaptured({ position: 'topright' }).addTo(map);
        selectMedalImg( "bronze" );
        map.on( 'zoomend', window.onZoomNC );
        map.on( "move", ()=> {
            Array.prototype.slice.call(document.getElementsByClassName( "dragLabels" )).forEach( item=>item.remove() );
            document.getElementById( 'NCbutSaveView' ).disabled = true;
        } );
        var butt = document.getElementById( "NCbutExpText" );
        butt.addEventListener("click", NCexport, false);
        NCloadStorage();
    } );
    // конец исполняется после body
})();