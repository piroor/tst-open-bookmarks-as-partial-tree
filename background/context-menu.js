/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs
} from '/common/common.js';

import * as Bookmark from './bookmark.js';
import * as Commands from './commands.js';


const SAFE_CREATE_PROPERTIES = [
  'checked',
  'contexts',
  'documentUrlPatterns',
  'enabled',
  'icons',
  'id',
  'parentId',
  'title',
  'type',
  'viewTypes',
  'visible'
];

function getSafeCreateParams(params) {
  const safeParams = {};
  for (const property of SAFE_CREATE_PROPERTIES) {
    if (property in params)
      safeParams[property] = params[property];
  }
  return safeParams;
}


const mItemsById = {
  openBookmarksWithStructure: {
    title: browser.i18n.getMessage('context_openBookmarksWithStructure_label')
  }
};
const mItems = [];
for (const id of Object.keys(mItemsById)) {
  const item = mItemsById[id];
  item.id        = id;
  item.contexts  = ['bookmark'];
  item.configKey = `context_${id}`;
  //item.icons = manifest.icons;

  mItems.push(item);
}

for (const item of mItems) {
  browser.menus.create(getSafeCreateParams(item));
}


browser.menus.onClicked.addListener(async info => {
  switch (info.menuItemId) {
    case 'openBookmarksWithStructure':
      const partialTreeItems = await Bookmark.getPartialTree(info.bookmarkId);
      Commands.openBookmarksWithStructure(partialTreeItems);
      break;
  }
});

browser.menus.onShown.addListener(async info => {
  let isFolder = true;
  let partialTreeItems = [];
  if (info.bookmarkId) {
    const item = await Bookmark.getItemById(info.bookmarkId);
    isFolder = (
      item.type == 'folder' ||
      (item.type == 'bookmark' &&
       /^place:parent=([^&]+)$/.test(item.url))
    );
    if (!isFolder)
      partialTreeItems = await Bookmark.getPartialTree(item);
  }

  mItemsById.openBookmarksWithStructure.visible = !!(
    partialTreeItems.length > 1 &&
    configs[mItemsById.openBookmarksWithStructure.configKey]
  );
  for (const item of mItems) {
    browser.menus.update(item.id, {
      visible: item.visible
    });
  }
  browser.menus.refresh();
});
