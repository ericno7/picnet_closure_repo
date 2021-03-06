﻿;
goog.provide('pn.ui.grid.pipe.RowSelectionHandler');

goog.require('goog.events.Event');
goog.require('pn.ui.grid.pipe.GridHandler');



/**
 * @constructor
 * @extends {pn.ui.grid.pipe.GridHandler}
 */
pn.ui.grid.pipe.RowSelectionHandler = function() {
  pn.ui.grid.pipe.GridHandler.call(this);
};
goog.inherits(pn.ui.grid.pipe.RowSelectionHandler,
    pn.ui.grid.pipe.GridHandler);


/** @override */
pn.ui.grid.pipe.RowSelectionHandler.prototype.postRender = function() {
  if (this.cfg.readonly || !this.cfg.allowEdit) { return; }
  this.slick.setSelectionModel(new Slick.RowSelectionModel());
  var selectionHandler = goog.bind(this.handleSelection_, this);
  this.slick.onSelectedRowsChanged.subscribe(selectionHandler);
};


/**
 * @private
 * @param {Event} ev The selection event from the SlickGrid.
 * @param {Object} evData The data for the selection event.
 */
pn.ui.grid.pipe.RowSelectionHandler.prototype.handleSelection_ =
    function(ev, evData) {
  var target = window.event.target || window.event.srcElement;

  // Ignore if triggered by row re-ordering.
  if (target.className.indexOf('reorder') >= 0) return;

  var idx = evData['rows'][0];
  var entity = this.view.getItem(idx);
  if (this.interceptor && !this.interceptor.canSelect(entity)) return;

  this.fireCustomEvent('select-row', entity);

  var event = new goog.events.Event(pn.ui.grid.Grid.SELECTED);
  event.selected = entity;
  this.pipeline.raiseGridEvent(event);
};
