/*
 * spa.shell.js
 * Shell module for SPA
 */

/*jslint        browser : true, continue : true,
  devel  : true, indent : 2,      maxerr : 50,
  newcap : true, nomen  : true, plusplus : true,
  regexp : true, sloppy : true,     vars : false,
  white  : true
*/
/*global $, spa */

spa.shell = (function() {
  // ----------------- Begin Module Scope Variables -----------------
  var
    configMap = {
      anchor_schema_map : {
        chat: { opened : true, closed : true }
      },
      mainHtml : String()
        + '<div class="spa-shell-head">'
          + '<div class="spa-shell-head-logo"></div>'
          + '<div class="spa-shell-head-acct"></div>'
          + '<div class="spa-shell-head-search"></div>'
        + '</div>'
        + '<div class="spa-shell-main">'
          + '<div class="spa-shell-main-nav"></div>'
          + '<div class="spa-shell-main-content"></div>'
        + '</div>'
        + '<div class="spa-shell-foot"></div>'
        + '<div class="spa-shell-modal"></div>'
    },
    stateMap = {
      $container : null,
      anchor_map : {},
    },
    jqueryMap = {},

    copyAnchorMap    , setJqueryMap ,
    changeAnchorPart , onHashChange ,
    setChatAnchor    , initModule;
  // ------------------ End Module Scope Variables ------------------


  // -------------------- BEGIN UTILITY METHODS ---------------------
  // Returns copy of stored anchor map; minimizes overhead
  copyAnchorMap = function () {
    return $.extend( true, {}, stateMap.anchor_map );
  };
  // --------------------- END UTILITY METHODS ----------------------


  // ---------------------- BEGIN DOM METHODS -----------------------
  // Begin DOM method /changeAnchorPart/
  // Purpose   : changes part of the URI anchor component
  // Arguments :
  //   * arg_map - The map descripbing what part of the uri anchor
  //     we want changed.
  // Returns   : boolean
  //   * true  - the Anchor portion of the URI was updated
  //   * false - the Anchor portion of the URI could not be updated
  // Action    :
  //  The current anchor rep stored in stateMap.anchor_map.
  //  See uriAnchor for a discussion of encoding.
  //  This method
  //    * Creates a copy of this map using copyAnchorMap().
  //    * Modifies the key-values using arg_map.
  //    * Manages the distinction between independent and
  //      dependent values in the encoding.
  //    * Attempts to change the URI using uriAnchor.
  //    * Returns true on success, and false on failure.
  //
  changeAnchorPart = function ( arg_map ) {
    var
      anchor_map_revise = copyAnchorMap(),
      bool_return = true,
      key_name, key_name_dep;

    // Begin merge changes into anchor map
    KEYVAL:
    for ( key_name in arg_map ) {
      if ( arg_map.hasOwnProperty( key_name ) ) {

        // skip dependent keys during iteration
        if ( key_name.indexOf( '_' ) === 0 ) { continue KEYVAL; }

        // update independent key value
        anchor_map_revise[key_name] = arg_map[key_name];

        // update matching dependent key
        key_name_dep = '_' + key_name;
        if ( arg_map[key_name_dep] ) {
          anchor_map_revise[key_name_dep] = arg_map[key_name_dep];
        }
        else {
          delete anchor_map_revise[key_name_dep];
          delete anchor_map_revise['_s' + key_name_dep];
        }
      }
    }
    // End merge changes into anchor map

    // Begin attempt to update URI; revert if not successful
    try {
      $.uriAnchor.setAnchor( anchor_map_revise );
    }
    catch ( error ){
      // replace URI with existing state
      $.uriAnchor.setAnchor( stateMap.anchor_map, null, true );

      bool_return = false;
    }
    // End attempt to update URI

    return bool_return;
  };
  // End DOM method /changeAnchorPart/

  // Begin DOM method /setJqueryMap/
  //
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container : $container
    };
  };
  // End DOM method /setJqueryMap/
  // ----------------------- END DOM METHODS ------------------------


  // -------------------- BEGIN EVENT HANDLERS ----------------------
  // Begin Event handler /onHashChange/
  // Purpose   : Handles the hashchange event
  // Arguments :
  //   * event - jQuery event object.
  // Settings  : none;
  // Returns   : false
  // Action    :
  //   * Parses the URI anchor component
  //   * Compares proposed application state with current
  //   * Adjust the application only where proposed state
  //     differes from existing and is allowed by anchor schema
  //
  onHashChange = function () {
    var
      _s_chat_previous, _s_chat_proposed, s_chat_proposed,
      anchor_map_proposed,
      is_ok               = true,
      anchor_map_previous = copyAnchorMap();

    // attempt to parse anchor
    try { anchor_map_proposed = $.uriAnchor.makeAnchorMap(); }
    catch ( error ) {
      $.uriAnchor.setAnchor( anchor_map_previous, null, true );
      return false;
    }
    stateMap.anchor_map = anchor_map_proposed;

    // convenience vars
    _s_chat_previous = anchor_map_previous._s_chat;
    _s_chat_proposed = anchor_map_proposed._s_chat;

    // Begin adjust chat component if changed
    if ( ! anchor_map_previous
      || _s_chat_previous !== _s_chat_proposed
    ) {
      s_chat_proposed = anchor_map_proposed.chat;
      switch ( s_chat_proposed ) {
        case 'opened' :
          is_ok = spa.chat.setSliderPosition( 'opened' );
          break;
        case 'closed' :
          is_ok = spa.chat.setSliderPosition( 'closed' );
          break;
        default :
          spa.chat.setSliderPosition( 'closed' );
          delete anchor_map_proposed.chat;
          $.uriAnchor.setAnchor( anchor_map_proposed, null, true );
      }
    }
    // End adjust chat component if changed

    // Begin revert anchor if slider change denied
    if ( ! is_ok ){
      if ( anchor_map_previous ){
        $.uriAnchor.setAnchor( anchor_map_previous, null, true );
        stateMap.anchor_map = anchor_map_previous;
      } else {
        delete anchor_map_proposed.chat;
        $.uriAnchor.setAnchor( anchor_map_proposed, null, true );
      }
    }

    return false;
  };
  // End Event handler /onHashChange/

  // Begin callback method /setChatAnchor/
  // Example   : setChatAnchor( 'closed' );
  // Purpose   : Change the chat component of the anchor
  // Arguments :
  //   * position_type - may be 'closed' or 'opened'
  // Action    :
  //   Changes the URI anchor parameter 'chat' to the requested value
  //   if possible.
  // Returns   :
  //   * true - requested anchor part was updated
  //   * false - requested anchor part was not updated
  // Throws    : none
  //
  setChatAnchor = function ( position_type ){
    return changeAnchorPart({ chat : position_type });
  };
  // End callback method /setChatAnchor/

  // --------------------- END EVENT HANDLERS -----------------------


  // -------------------- BEGIN PUBLIC METHODS ----------------------
  // Begin Public method /initModule/
  // Example   : spa.shell.initModule( $('$app_div_id') );
  // Purpose   :
  //   Directs the Shell to offer its capability to the user
  // Arguments :
  //   * $container
  //     A jQuery collection that should represent
  //     a single DOM container
  // Action    :
  //   Populates $container with the shell of the UI
  //   and then configures and initializes feature modules.
  //   The Shell is also responsibile for browser-wide issues
  //   such as URI anchor and cookie management.
  // Returns   : none
  // Throws    : none
  //
  initModule = function ( $container ) {
    stateMap.$container = $container;
    $container.html( configMap.mainHtml );
    setJqueryMap();

    // Configure uriAnchor to use our schema
    $.uriAnchor.configModule({
      schema_map : configMap.anchor_schema_map
    });

    // Configure and initialize feature modules
    spa.chat.configModule( {
      set_chat_anchor : setChatAnchor,
      chat_model      : spa.model.chat,
      people_model    : spa.model.people
    });
    spa.chat.initModule( jqueryMap.$container );

    // Handle URI anchor change events
    // This is done /after/ all feature modules are configured
    // and initialized, otherwise they will not be ready to
    // handle the triggered event, which is used to ensure the
    // anchor is considered on load.
    //
    $(window)
      .bind( 'hashchange', onHashChange )
      .trigger( 'hashchange' );
  };
  // End Public method /initModule/
  // --------------------- END PUBLIC METHODS -----------------------

  return { initModule : initModule };
}());
