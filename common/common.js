/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Configs from '/extlib/Configs.js';

export const configs = new Configs({
  context_openPartialTreeFromHere: true,
  context_openAll: true,
  context_openAllRecursively: false,

  container_openPartialTreeFromHere: false,
  container_openAll: false,
  container_openAllRecursively: true,

  openDiscarded: true,
}, {
  localKeys: [
  ]
});


// Helper functions for optimization
// Originally implemented by @bb010g at
// https://github.com/piroor/treestyletab/pull/2368/commits/9d184c4ac6c9977d2557cd17cec8c2a0f21dd527

// For better performance the callback function must return "undefined"
// when the item should not be included. "null", "false", and other false
// values will be included to the mapped result.
export function mapAndFilter(values, mapper) {
  /* This function logically equals to:
  return values.reduce((mappedValues, value) => {
    value = mapper(value);
    if (value !== undefined)
      mappedValues.push(value);
    return mappedValues;
  }, []);
  */
  const maxi = ('length' in values ? values.length : values.size) >>> 0; // define as unsigned int
  const mappedValues = new Array(maxi); // prepare with enough size at first, to avoid needless re-allocation
  let count = 0,
      value, // this must be defined outside of the loop, to avoid needless re-allocation
      mappedValue; // this must be defined outside of the loop, to avoid needless re-allocation
  for (value of values) {
    mappedValue = mapper(value);
    if (mappedValue !== undefined)
      mappedValues[count++] = mappedValue;
  }
  mappedValues.length = count; // shrink the array at last
  return mappedValues;
}

export function mapAndFilterUniq(values, mapper, options = {}) {
  const mappedValues = new Set();
  let value, // this must be defined outside of the loop, to avoid needless re-allocation
      mappedValue; // this must be defined outside of the loop, to avoid needless re-allocation
  for (value of values) {
    mappedValue = mapper(value);
    if (mappedValue !== undefined)
      mappedValues.add(mappedValue);
  }
  return options.set ? mappedValues : Array.from(mappedValues);
}

export function countMatched(values, matcher) {
  /* This function logically equals to:
  return values.reduce((count, value) => {
    if (matcher(value))
      count++;
    return count;
  }, 0);
  */
  let count = 0,
      value; // this must be defined outside of the loop, to avoid needless re-allocation
  for (value of values) {
    if (matcher(value))
      count++;
  }
  return count;
}
