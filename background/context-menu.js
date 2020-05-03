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
import * as ContextualIdentities from './contextual-identities.js';


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
  'openPartialTreeFromHere': {
    title: browser.i18n.getMessage('context_openPartialTreeFromHere_label'),
    isPartialTree: true
  },
  'openPartialTreeFromHere:container': {
    title: browser.i18n.getMessage('context_openPartialTreeFromHere_label'),
    isPartialTree: true
  },
  'openAll': {
    title: browser.i18n.getMessage('context_openAll_label'),
    isFolder: true
  },
  'openAll:container': {
    title: browser.i18n.getMessage('context_openAll_label'),
    isFolder: true
  },
  'openAllRecursively': {
    title: browser.i18n.getMessage('context_openAllRecursively_label'),
    isFolder: true
  },
  'openAllRecursively:container': {
    title: browser.i18n.getMessage('context_openAllRecursively_label'),
    isFolder: true
  }
};
const mItems = [];
const mNonContainerItems = [];
const mContainerMenuItems = [];
for (const id of Object.keys(mItemsById)) {
  const item = mItemsById[id];
  item.id        = id;
  item.contexts  = ['bookmark'];
  //item.icons = manifest.icons;

  mItems.push(item);
  if (id.endsWith(':container')) {
    mContainerMenuItems.push(item);
    item.configKey = item.id.replace(/:container$/, '');
    item.children = [];
  }
  else {
    item.configKey = item.id;
    mNonContainerItems.push(item);
  }
}
for (const item of mItems) {
  browser.menus.create(getSafeCreateParams(item));
}

async function refreshContainerItems() {
  for (const parent of mContainerMenuItems) {
    for (const child of parent.children) {
      browser.menus.remove(child.id);
    }
    parent.children = [];
  }
  for (const parent of mContainerMenuItems) {
    const defaultItem = {
      parentId: parent.id,
      id:       `${parent.id}:default`,
      title:    browser.i18n.getMessage('context_defaultContainer_label'),
      contexts: ['bookmark']
    };
    parent.children.push(defaultItem);
    browser.menus.create(defaultItem);
    const separator = {
      parentId: parent.id,
      id:       `${parent.id}:default-separator`,
      type:     'separator',
      contexts: ['bookmark']
    };
    parent.children.push(separator);
    browser.menus.create(separator);
  }
  await ContextualIdentities.forEach(identity => {
    for (const parent of mContainerMenuItems) {
      const id = `${parent.id}:${identity.cookieStoreId}`;
      const item = {
        parentId: parent.id,
        id:       id,
        title:    identity.name.replace(/^([a-z0-9])/i, '&$1'),
        contexts: ['bookmark']
      };
      if (identity.iconUrl)
        item.icons = { 16: identity.iconUrl };
      parent.children.push(item);
      browser.menus.create(item);
    }
  });
  browser.menus.refresh();
}
refreshContainerItems();

function reserveToRefreshContainerItems() {
  if (reserveToRefreshContainerItems.reserved)
    clearTimeout(reserveToRefreshContainerItems.reserved);
  reserveToRefreshContainerItems.reserved = setTimeout(() => {
    reserveToRefreshContainerItems.reserved = null;
    refreshContainerItems();
  }, 100);
}
reserveToRefreshContainerItems.reserved = null;
ContextualIdentities.onUpdated.addListener(reserveToRefreshContainerItems);


browser.menus.onClicked.addListener(async info => {
  const [, menuItemId, parameters] = info.menuItemId.match(/^([^:]+)(?::(.*))?/);
  const cookieStoreId = parameters && parameters.replace(/^container:/, '');
  switch (menuItemId) {
    case 'openPartialTreeFromHere': {
      const partialTreeItems = await Bookmark.getPartialTree(info.bookmarkId);
      if (cookieStoreId && cookieStoreId != 'default')
        Commands.openBookmarksWithStructure(partialTreeItems, {
          cookieStoreId
        });
      else
        Commands.openBookmarksWithStructure(partialTreeItems);
    }; break;

    case 'openAll':
      if (cookieStoreId && cookieStoreId != 'default')
        Commands.openAllBookmarksWithStructure(info.bookmarkId, {
          cookieStoreId
        });
      else
        Commands.openAllBookmarksWithStructure(info.bookmarkId);
      break;

    case 'openAllRecursively':
      if (cookieStoreId && cookieStoreId != 'default')
        Commands.openAllBookmarksWithStructure(info.bookmarkId, {
          cookieStoreId,
          recursively: true
        });
      else
        Commands.openAllBookmarksWithStructure(info.bookmarkId, {
          recursively: true
        });
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

  for (const item of mContainerMenuItems) {
    const visible = item.isPartialTree ?
      partialTreeItems.length > 1 :
      item.isFolder ?
        isFolder :
        true;
    item.visible = !!(
      visible &&
      configs[`context_${item.configKey}`] &&
      configs[`container_${item.configKey}`] &&
      item.children.length > 0
    );
  }
  for (const item of mNonContainerItems) {
    const visible = item.isPartialTree ?
      partialTreeItems.length > 1 :
      item.isFolder ?
        isFolder :
        true;
    item.visible = !!(
      visible &&
      configs[`context_${item.configKey}`] &&
      !mItemsById[`${item.id}:container`].visible
    );
  }

  for (const item of mItems) {
    browser.menus.update(item.id, {
      visible: item.visible
    });
  }
  browser.menus.refresh();
});
