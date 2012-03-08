﻿;
goog.provide('pn.ui.edit.FieldBuilder');

goog.require('goog.date.Date');
goog.require('goog.events.EventHandler');
goog.require('goog.string');
goog.require('goog.ui.ComboBox');
goog.require('goog.ui.ComboBoxItem');
goog.require('pn.ui.UiSpecsRegister');


/**
 * @param {string} id The id of this label/field.
 * @param {boolean} required Whether this field is required.
 * @param {string=} opt_name The text for this label. The id is used
 *  if ommitted.
 * @param {string=} opt_clazz An optional class name.  Will use 'field' if
 *    not specified.
 * @return {!Element} The label element wrapped in a div.
 */
pn.ui.edit.FieldBuilder.getFieldLabel =
    function(id, required, opt_name, opt_clazz) {
  goog.asserts.assert(id);
  var clazz = (opt_clazz || 'field') + (required ? ' required' : '');
  var dom = goog.dom.createDom('div', clazz,
      goog.dom.createDom('label', {
        'for': id
      }, opt_name || id));
  return dom;
};


/**
 * @param {!(Element|goog.ui.Component)} inp The input field.
 * @return {string} The value in the specified field.
 */
pn.ui.edit.FieldBuilder.getFieldValue = function(inp) {
  goog.asserts.assert(inp);

  if (inp.getDate) {
    var d = inp.getDate();
    if (d) d = new goog.date.Date(d.getYear(), d.getMonth(), d.getDate());
    return d ? d.getTime() : 0;
  }
  if (inp.getValue) { return inp.getValue(); }
  else if (inp.options) {
    var arr = [];
    goog.array.forEach(inp.options, function(o) {
      if (o.selected) { arr.push(o.value); }
    });
    return inp.multiple && arr.length > 1 ? arr : arr[0];
  }
  else if (inp.type === 'checkbox') { return inp.checked; }
  else { return inp.value; }
};


/**
 * @param {!pn.ui.edit.Field} field The field to create a dom tree for.
 * @param {!Element} parent The parent to attach this input control to.
 * @param {!Object} entity The entity being displayed.
 * @param {!Object.<Array>} cache The data cache to use for related entities.
 * @param {boolean=} opt_search If this field is being created in search mode.
 * @return {!Element|!goog.ui.Component} The created dom element.
 */
pn.ui.edit.FieldBuilder.createAndAttach =
    function(field, parent, entity, cache, opt_search) {
  var fb = pn.ui.edit.FieldBuilder;
  var useDefault = !entity['ID'] && field.defaultValue;
  var val = useDefault ? field.defaultValue : entity[field.dataColumn];
  if (useDefault && field.source) {
    val = goog.array.find(cache[field.source], function(e) {
      return e[field.source + 'Name'] === val;
    })['ID'];
  }

  var elem;
  if (field.renderer) {
    if (field.source) {
      val = fb.getValueFromSourceTable_(field, val, cache);
    }
    if (typeof (field.renderer) === 'object') {
      elem = field.renderer;
      field.renderer.initialise(val, entity, cache, field);
      elem.render(parent);
    } else {
      elem = field.renderer(val, entity, parent, opt_search);
    }
  } else if (field.source && !field.tableType) {
    elem = fb.createParentEntitySelect(field, val, cache, opt_search);
    goog.dom.appendChild(parent, /** @type {!Node} */ (elem));
  } else if (field.tableType) {
    elem = fb.createChildEntitiesSelectTable_(field, parent, entity, cache);
  } else {
    elem = goog.dom.createDom('input',
        { 'id': field.id, 'type': 'text', 'value': val || '' });
    goog.dom.appendChild(parent, elem);
  }
  return elem;
};


/**
 * @param {!pn.ui.SpecDisplayItem} spec The field/column to create a
 *    dom tree for.
 * @param {number} id The ID of the current child entity (this).
 * @param {!Object.<Array>} cache The data cache to use for related entities.
 * @param {boolean=} opt_search If this field is being created in search mode.
 * @return {!Element} The created dom element.
 */
pn.ui.edit.FieldBuilder.createParentEntitySelect =
    function(spec, id, cache, opt_search) {
  var steps = spec.source.split('.');
  var entityType = steps[steps.length === 1 ? 0 : steps.length - 2];
  if (goog.string.endsWith(entityType, 'Entities')) {
    entityType = goog.string.remove(entityType, 'Entities');
  }
  var textField = steps.length === 1 ?
      entityType + 'Name' : steps[steps.length - 1];
  var list = cache[entityType];
  if (spec.sourceFilter) { list = spec.sourceFilter(list, cache); }

  if (!list) throw new Error('Expected access to "' + entityType +
      '" but could not be found in cache. Field: ' + goog.debug.expose(spec));

  var opts = { 'id': spec.id };
  if (opt_search === true) {
    opts['multiple'] = 'multiple';
    opts['rows'] = 2;
  }
  var selTxt = 'Select ' + spec.name + ' ...';
  return pn.ui.edit.FieldBuilder.
      createDropDownList(selTxt, list, textField, 'ID', id, opts);
};


/**
 * @param {string} selectTxt The message to display in the first element of the
 *    list.
 * @param {!Array.<Object>} list The list of entities.
 * @param {string} txtf The text field property name.
 * @param {string} valf The value field property name.
 * @param {*} selValue The selected value in the valf field.
 * @param {!Object} opts The select list additional options.
 * @return {!Element} The select box.
 */
pn.ui.edit.FieldBuilder.createDropDownList =
    function(selectTxt, list, txtf, valf, selValue, opts) {
  var select = goog.dom.createDom('select', opts);
  if (selectTxt) {
    goog.dom.appendChild(select, goog.dom.createDom('option',
        {'value': '0' }, selectTxt));
  }
  var options = [];
  goog.array.forEach(list, function(e) {
    opts = {'value': e[valf]};
    if (selValue && e[valf] === selValue) { opts['selected'] = 'selected'; }
    var txt = e[txtf] ? e[txtf].toString() : null;
    goog.asserts.assert(txt !== undefined);
    if (txt) options.push(goog.dom.createDom('option', opts, txt));
  });
  goog.array.sortObjectsByKey(options, 'innerHTML',
      goog.string.caseInsensitiveCompare);
  goog.array.forEach(options, function(o) {
    goog.dom.appendChild(select, o);
  });
  return select;
};


/**
 * @param {string} selectTxt The message to display in the first element of the
 *    list.
 * @param {!Array.<Object>} list The list of entities.
 * @param {string} txtf The text field property name.
 * @return {goog.ui.ComboBox} The select box.
 */
pn.ui.edit.FieldBuilder.createCombo = function(selectTxt, list, txtf) {
  goog.array.sortObjectsByKey(list, txtf,
      goog.string.caseInsensitiveCompare);
  var cb = new goog.ui.ComboBox();
  cb.setUseDropdownArrow(true);
  if (selectTxt) { cb.setDefaultText(selectTxt); }
  goog.array.forEach(list, function(e) {
    cb.addItem(new goog.ui.ComboBoxItem(e[txtf]));
  });
  return cb;
};


/**
 * @private
 * @param {!pn.ui.SpecDisplayItem} spec The field/column to create a
 *    dom tree for.
 * @param {number} id The ID of the current child entity (this).
 * @param {!Object.<Array>} cache The data cache to use for related entities.
 * @return {string} The value from the selected parent eneity.
 */
pn.ui.edit.FieldBuilder.getValueFromSourceTable_ = function(spec, id, cache) {
  var relationship = spec.source.split('.');
  var list = cache[relationship[0]];
  if (!list) throw new Error('Expected access to "' + relationship[0] +
      '" but could not be found in cache. Field: ' + goog.debug.expose(spec));
  var source = goog.array.find(list, function(e) {
    return e['ID'] === id;
  });
  return !source ? 'n/a' : source[relationship[1] || relationship[0] + 'Name'];
};


/**
 * @private
 * @param {!pn.ui.edit.Field} field The field to create a dom tree for.
 * @param {!Element} parent The parent to attach this input control to.
 * @param {Object} entity The entity being displayed.  Cannot be null.
 * @param {!Object.<Array>} cache The data cache to use for related entities.
 * @return {!Element|!goog.ui.Component} The created dom element.
 */
pn.ui.edit.FieldBuilder.createChildEntitiesSelectTable_ =
    function(field, parent, entity, cache) {
  goog.asserts.assert(entity);
  goog.asserts.assert(field.tableType);
  goog.asserts.assert(entity['ID'], 'Entity not saved.');

  var parentId = entity['ID'];

  var parentField = field.tableParentField;
  var list = cache[field.tableType];
  if (!list) list = cache[goog.string.remove(field['id'], 'Entities')];
  if (!list) throw new Error('Expected access to "' + field.tableType +
      '" but could not be found in cache. Field: ' + goog.debug.expose(field));
  var data = !parentId ? [] : goog.array.filter(list,
      function(c) { return c[parentField] === parentId; });
  var spec = pn.ui.UiSpecsRegister.get(field.tableSpec);
  var g = pn.ui.edit.FieldBuilder.createGrid(spec, data, cache);
  g.decorate(parent);
  return g;
};


/**
 * @param {!pn.ui.UiSpec} spec The specs for the entities in
 *    this grid.
 * @param {!Array.<Object>} data The grid data.
 * @param {!Object.<Array>} cache The data cache to use for related entities.
 * @return {!pn.ui.grid.Grid} The created grid.
 */
pn.ui.edit.FieldBuilder.createGrid = function(spec, data, cache) {
  // TODO: This is so dodgy, find a better way of working out width
  var viewContainer = pn.Utils.getElement('view-container');
  var width = goog.style.getSize(viewContainer).width - 25;
  var grid = new pn.ui.grid.Grid(spec, data, cache, width);
  return grid;
};
