/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { A } from '@ember/array';
import Component from '@ember/component';
import EmberObject, { action, computed, observer } from '@ember/object';
import { gt, lt } from '@ember/object/computed';
import layout from '../templates/components/em-table-facet-panel-values';

const LIST_LIMIT = 7;

export default Component.extend({
  attributeBindings: ['shouldHide:hidden'],
  layout: layout,

  data: null,
  checkedCount: null,

  tableDefinition: null,
  dataProcessor: null,

  tmpFacetConditions: null,

  hideValues: true,

  currentPage: 1,

  classNames: ['em-table-facet-panel-values'],
  classNameBindings: ['hideValues', 'hideFilter', 'hideSelectAll'],

  filterText: null,
  allButtonTitle: computed("filterText", function () {
    let filterText = this.filterText;
    return filterText ? `Select all with substring '${filterText}'` : "Select all";
  }),
  shouldHide: computed("data.facets.length", "tableDefinition.minValuesToDisplay", function () {
    return this.get("data.facets.length") < this.get("tableDefinition.minValuesToDisplay");
  }),
  hideFilter: lt("allFacets.length", LIST_LIMIT),
  hideSelectAll: computed('checkedCount', 'data.facets.length', 'fieldFacetConditions.in.length', function () {
    return this.get("fieldFacetConditions.in.length") === this.get("data.facets.length");
  }),

  fieldFacetConditions: computed('data.column.id', 'data.facets', 'tmpFacetConditions', function () {
    var columnID = this.get("data.column.id"),
        conditions = this.get(`tmpFacetConditions.${columnID}`),
        facets = this.get("data.facets") || [];

    if(!conditions) {
      conditions = {
        in: facets.map(facet => facet.value)
      };
      this.set(`tmpFacetConditions.${columnID}`, conditions);
    }

    return conditions;
  }),

  allFacets: computed('data.facets', 'fieldFacetConditions.in', function () {
    var facets = this.get("data.facets") || [],

        checkedValues = this.get("fieldFacetConditions.in"),
        selectionHash = {};

    if(checkedValues) {
      checkedValues.forEach(function (valueText) {
        selectionHash[valueText] = 1;
      });
    }

    return A(facets.map(function (facet) {
      facet = EmberObject.create(facet);
      facet.set("checked", selectionHash[facet.value]);

      if(!facet.get("displayText")) {
        facet.set("displayText", facet.get("value"));
      }

      return facet;
    }));
  }),

  filteredFacets: computed("allFacets", "filterText", function () {
    var allFacets = this.allFacets,
        filterText = this.filterText,
        filteredFacets;

    if(filterText) {
      filteredFacets = allFacets.filter(function (facet) {
        return facet.get("value").match(filterText);
      });
    }
    else {
      filteredFacets = allFacets;
    }

    return filteredFacets;
  }),

  _filterObserver: observer("filterText", function () {
    this.set("currentPage", 1);
  }),

  totalPages: computed("filteredFacets.length", "tableDefinition.facetValuesPageSize", function () {
    return Math.ceil(this.get("filteredFacets.length") / this.get("tableDefinition.facetValuesPageSize"));
  }),
  showPagination: gt('totalPages', 1),
  showPrevious: gt('currentPage', 1),
  showNext: computed("currentPage", "totalPages", function () {
    return this.currentPage < this.totalPages;
  }),

  paginatedFacets: computed("filteredFacets", "currentPage", "tableDefinition.facetValuesPageSize", function () {
    let currentPage = this.currentPage,
        pageSize = this.get("tableDefinition.facetValuesPageSize");
    return this.filteredFacets.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize);
  }),

  changePage: action(function (factor) {
    var newPage = this.currentPage + factor;
    if(newPage > 0 && newPage <= this.totalPages) {
      this.set("currentPage", newPage);
    }
  }),
  toggleValueDisplay: action(function () {
    this.toggleProperty("hideValues");
  }),
  clickedCheckbox: action(function (facet) {
    var checkedValues = this.get("fieldFacetConditions.in"),
      value = facet.get("value"),
      valueIndex = checkedValues.indexOf(value);

    facet.toggleProperty("checked");

    if(facet.get("checked")) {
      if(valueIndex === -1) {
        checkedValues.push(value);
      }
    }
    else if(valueIndex !== -1) {
      checkedValues.splice(valueIndex, 1);
    }

    this.set("checkedCount", checkedValues.length);
  }),

  selectAll: action(function () {
    var filteredFacets = this.filteredFacets,
      checkedValues = this.get("fieldFacetConditions.in");

    filteredFacets.forEach(function (facet) {
      if(!facet.get("checked")) {
        checkedValues.push(facet.get("value"));
      }

      facet.set("checked", true);
    });

    this.set("fieldFacetConditions.in", checkedValues);
    this.set("checkedCount", checkedValues.length);
  }),
  clickedOnly: action(function (facet) {
    var allFacets = this.allFacets,
      checkedValues = [];

    allFacets.forEach(function (facet) {
      facet.set("checked", false);
    });

    facet.set("checked", true);
    checkedValues.push(facet.get("value"));

    this.set("fieldFacetConditions.in", checkedValues);
    this.set("checkedCount", checkedValues.length);
  })
});
