﻿;
goog.provide('pn.ui.edit.AddOnFlyRenderer');

goog.require('goog.ui.Dialog');
goog.require('pn.ui.edit.ComplexRenderer');
goog.require('pn.ui.edit.Edit');



/**
 * @constructor
 * @extends {pn.ui.edit.ComplexRenderer}
 * @param {string} specId The ID of the specs to display in this add on the
 *    fly control.
 */
pn.ui.edit.AddOnFlyRenderer = function(specId) {
  pn.ui.edit.ComplexRenderer.call(this);

  /**
   * @private
   * @type {string}
   */
  this.specId_ = specId;

  /**
   * @private
   * @type {pn.ui.UiSpec}
   */
  this.spec_ = null;

  /**
   * @private
   * @type {!Element}
   */
  this.add_ = goog.dom.createDom('a', 'add-on-fly-add-button', 'Add');

  /**
   * @private
   * @type {!Element}
   */
  this.select_ = goog.dom.createDom('select', 'add-on-fly-select');
};
goog.inherits(pn.ui.edit.AddOnFlyRenderer, pn.ui.edit.ComplexRenderer);


/** @inheritDoc */
pn.ui.edit.AddOnFlyRenderer.prototype.getValue = function() {
  return null;
};


/** @inheritDoc */
pn.ui.edit.AddOnFlyRenderer.prototype.initialise = function(spec) {
  pn.ui.edit.AddOnFlyRenderer.superClass_.initialise.call(this, spec);

  this.spec_ = pn.app.ctx.specs.get(this.specId_);
  this.registerDisposable(this.spec_);
};


/** @inheritDoc */
pn.ui.edit.AddOnFlyRenderer.prototype.decorateInternal = function(element) {
  goog.asserts.assert(element);
  this.setElementInternal(element);

  var dom = goog.dom.createDom('div', 'add-on-fly',
      this.select_,
      this.add_);

  goog.dom.appendChild(element, dom);
};


/** @inheritDoc */
pn.ui.edit.AddOnFlyRenderer.prototype.enterDocument = function() {
  pn.ui.edit.AddOnFlyRenderer.superClass_.enterDocument.call(this);

  this.eh.listen(this.add_, goog.events.EventType.CLICK, this.addOnFly_);

  this.refreshList_();
};


/** @private */
pn.ui.edit.AddOnFlyRenderer.prototype.addOnFly_ = function() {
  var dialog = new goog.ui.Dialog();
  dialog.setTitle('Add ' + this.spec_.name);
  dialog.setModal(true);
  dialog.setButtonSet(goog.ui.Dialog.ButtonSet.createOkCancel());

  var el = dialog.getDialogElement();
  var edit = new pn.ui.edit.Edit(this.spec_, { 'ID': 0 }, this.fctx.cache);
  edit.render(el);

  dialog.setVisible(true);

  goog.events.listen(dialog, goog.ui.Dialog.EventType.SELECT, function(e) {
    if (e.key === 'cancel') {
      goog.dispose(edit);
      dialog.dispose();
      return;
    }
    if (this.validate_(edit)) {
      dialog.dispose();
      goog.dispose(edit);
      this.doAdd_(edit);
    }
  }, false, this);
};


/**
 * @private
 * @param {!pn.ui.edit.Edit} edit The Edit compoenent to validate.
 * @return {boolean} Wether the current form is valid.
 */
pn.ui.edit.AddOnFlyRenderer.prototype.validate_ = function(edit) {
  var errors = edit.getFormErrors();
  if (!errors.length) return true;
  // TODO: Show errors in the dialog??  For now just use generic errors.
  pn.app.ctx.pub(pn.app.AppEvents.ENTITY_VALIDATION_ERROR, errors);
  return false;
};


/**
 * @private
 * @param {!pn.ui.edit.Edit} edit The Edit compoenent that needs to be
 *    queried for entity to add.
 */
pn.ui.edit.AddOnFlyRenderer.prototype.doAdd_ = function(edit) {
  var entity = edit.getCurrentFormData();
  var cb = goog.bind(this.entityAdded_, this);
  pn.app.ctx.pub(pn.oms.OmsEvents.ENTITY_SAVE, this.spec_.type, entity, cb);
};


/**
 * @private
 * @param {(string|Object)} saved The server error or the entity that was added.
 */
pn.ui.edit.AddOnFlyRenderer.prototype.entityAdded_ = function(saved) {
  if (goog.isString(saved)) { alert(saved); return; }
  this.fctx.cache[this.spec_.type].splice(0, 0, saved);
  this.refreshList_(saved['ID']);
};


/**
 * @private
 * @param {number=} opt_selected The optinal currently selected ID.
 */
pn.ui.edit.AddOnFlyRenderer.prototype.refreshList_ = function(opt_selected) {
  var type = this.spec_.type;
  var list = this.fctx.cache[type];
  var nameProp = type + 'Name';
  goog.array.sort(list, function(a, b) {
    return goog.string.caseInsensitiveCompare(a[nameProp], b[nameProp]);
  });
  goog.dom.removeChildren(this.select_);
  var currentId = opt_selected || this.fctx.getEntityValue();
  goog.array.forEach(list, function(e) {
    goog.dom.appendChild(this.select_, goog.dom.createDom('option', {
      'value': e['ID'],
      'text': e[nameProp],
      'selected': e['ID'] === currentId
    }));
  }, this);
};


/** @inheritDoc */
pn.ui.edit.AddOnFlyRenderer.prototype.disposeInternal = function() {
  pn.ui.edit.AddOnFlyRenderer.superClass_.disposeInternal.call(this);

  goog.dispose(this.select_);
  goog.dispose(this.add_);

  delete this.spec_;
  delete this.select_;
  delete this.add_;
};