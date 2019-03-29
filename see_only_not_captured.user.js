// ==UserScript==
// @id             iitc-plugin-uporin@jonatkins
// @name           IITC plugin: Uporin
// @author         ReinRaus
// @version        2.0.2
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://github.com/ReinRaus/SeeOnlyNotCaptured/raw/master/see_only_not_captured.user.js
// @description    Show only not captured portal
// @include        https://intel.ingress.com/*
// @include        http://intel.ingress.com/*
// @match          https://intel.ingress.com/*
// @match          http://intel.ingress.com/*
// @grant          GM_xmlhttpRequest
// @connect        upor.in
// ==/UserScript==

/*global
L, layerChooser, map, GM_http
*/

GM_http= GM_xmlhttpRequest; // в глобальное окружение

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'iitc-uporin';
plugin_info.dateTimeVersion = '20190325';
plugin_info.pluginId = 'filter-uporin';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////


// use own namespace for plugin
window.plugin.uporin = function() {};
var uporin = window.plugin.uporin;

var storage;
try {
    storage = JSON.parse( localStorage.pluginUporin );
} catch(e) {
    storage = {};
    localStorage.pluginUporin = JSON.stringify( storage );
}
if ( storage.portals ) uporin.portals = storage.portals;

uporin.showLayerByName = function ( layerName, show ) {
    layerChooser.showLayer(
        layerChooser.getLayers().overlayLayers.find( el=>el.name==layerName ).layerId,
        show );
};

uporin.injectCSS = function (str) {
    var node = document.createElement('style');
    node.innerHTML = str;
    document.body.appendChild(node);
};
uporin.injectCSS( "path:hover {stroke-opacity:1 !important; fill-opacity:0.5 !important;}" ); // стандартная прозрачность, но для hover

uporin.updateCaptureList = function( response ) {
    var portalsText = response.responseText.match(/\bportals=(\[[\s\S]*\}\])\s/);
    if ( portalsText[1] && portalsText[1] != "" ) {
        var portals = eval( portalsText[1] );
        uporin.portals = {};
        portals.forEach( el=> uporin.portals[ el.lat+","+el.lng ] = true );
        storage.portals = uporin.portals;
        localStorage.pluginUporin = JSON.stringify( storage );
    } else if ( storage.portals ) {
        uporin.portals = storage.portals;
    } else uporin.portals = {};
};

uporin.errorLoad = function() {
    alert( "Ошибка при загрузке. Возможно, сервис не отвечает или Вам необходимо авторизоваться." );
};

uporin.start = function() {

  GM_http({method:"GET", url:"https://upor.in/caps/", onload:uporin.updateCaptureList, onerror:uporin.errorLoad});

  window.addPortalHighlighter('Show not captured', (data)=>{
      if ( uporin.portals && !(data.portal._latlng.lat+","+data.portal._latlng.lng in uporin.portals) ) data.portal.setStyle({color: "#FF0000", weight: 3.5, fillOpacity:1});
  } );

  window.addPortalHighlighter( 'Only not captured', (data)=>{
      if ( uporin.portals && !(data.portal._latlng.lat+","+data.portal._latlng.lng in uporin.portals) ) data.portal.setStyle({weight: 3.5, fillOpacity:1});
      else data.portal.setStyle({opacity: 0.1, fillOpacity:0.1});
  } );

  $( "#portal_highlight_select" ).on( "change", function (event) {
      if ( this.value == "Only not captured" ) {
          storage.saveLayerFields = isLayerGroupDisplayed( "Fields" );
          storage.saveLayerLinks = isLayerGroupDisplayed( "Links" );
          localStorage.pluginUporin = JSON.stringify( storage );
          uporin.showLayerByName( "Fields", false );
          uporin.showLayerByName( "Links", false );
      } else {
          uporin.showLayerByName( "Fields", storage.saveLayerFields );
          uporin.showLayerByName( "Links", storage.saveLayerLinks );
      };
  } );

};

var setup = window.plugin.uporin.start;

// PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
