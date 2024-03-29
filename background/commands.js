/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  countMatched,
  configs,
  ensureTSTDetected,
  callTSTAPI,
} from '/common/common.js';

import * as ContextualIdentities from './contextual-identities.js';

const DESCENDANT_MATCHER = /^(>+) /;

const FORBIDDEN_URL_MATCHER = /^(about|chrome|resource|file):/;
const ALLOWED_URL_MATCHER = /^about:blank(\?|$)/;
const GROUP_TAB_MATCHER = /^ext\+(treestyletab|ws):group/;

export async function openBookmarksWithStructure(items, { discarded, cookieStoreId } = {}) {
  if (typeof discarded == 'undefined')
    discarded = configs.openDiscarded;

  const lastItemIndicesWithLevel = new Map();
  let lastMaxLevel = 0;
  const containerMatcher = new RegExp(`#${configs.containerRedirectKey}-(.+)$`);
  const structure = items.reduce((result, item, index) => {
    if (item.url) {
      // Respect container type stored by Container Bookmarks
      // https://addons.mozilla.org/firefox/addon/container-bookmarks/
      const matchedContainer = item.url.match(containerMatcher);
      if (matchedContainer) {
        const cookieStoreId = ContextualIdentities.getIdFromName(decodeURIComponent(matchedContainer[matchedContainer.length-1]));
        if (cookieStoreId) {
          item.cookieStoreId = cookieStoreId;
          item.url = item.url.replace(containerMatcher, '');
        }
      }

      if (FORBIDDEN_URL_MATCHER.test(item.url) &&
          !ALLOWED_URL_MATCHER.test(item.url))
        item.url = `about:blank?${item.url}`;
    }

    let level = 0;
    if (lastItemIndicesWithLevel.size > 0 &&
        item.title.match(DESCENDANT_MATCHER)) {
      level = RegExp.$1.length;
      if (level - lastMaxLevel > 1) {
        level = lastMaxLevel + 1;
      }
      else {
        while (lastMaxLevel > level) {
          lastItemIndicesWithLevel.delete(lastMaxLevel--);
        }
      }
      lastItemIndicesWithLevel.set(level, index);
      lastMaxLevel = level;
      result.push(lastItemIndicesWithLevel.get(level - 1) - lastItemIndicesWithLevel.get(0));
      item.title = item.title.replace(DESCENDANT_MATCHER, '')
    }
    else {
      result.push(-1);
      lastItemIndicesWithLevel.clear();
      lastItemIndicesWithLevel.set(0, index);
    }
    return result;
  }, []);

  const window = await browser.windows.getCurrent({ populate: true });

  const firstRegularItemIndex = items.findIndex(item => !GROUP_TAB_MATCHER.test(item.url));

  const windowId = window.id;
  await callTSTAPI({
    type: 'block-grouping',
    windowId
  });

  try {
    const firstTab = await callTSTAPI({ type: 'create', params: {
      windowId,
      url:       items[0].url,
      active:    firstRegularItemIndex == 0,
      discarded: discarded && firstRegularItemIndex != 0 && !GROUP_TAB_MATCHER.test(items[0].url),
      cookieStoreId: cookieStoreId || items[0].cookieStoreId || null
    }});

    const tabs = [firstTab];
    let offset = 0;
    for (const item of items.slice(1)) {
      offset++;
      const params = {
        title:  item.title,
        url:    item.url,
        active: firstRegularItemIndex == offset,
        index:  firstTab.index + offset,
        windowId,
        discarded,
        cookieStoreId: cookieStoreId || item.cookieStoreId || null
      };
      if (params.active ||
          GROUP_TAB_MATCHER.test(params.url) ||
          /^about:/.test(params.url)) // discarded tab cannot be opened with any about: URL
        params.discarded = false;
      if (!params.discarded) // title cannot be set for non-discarded tabs
        params.title = null;
      tabs.push(await callTSTAPI({ type: 'create', params }));
    }

    await callTSTAPI({
      type: 'set-tree-structure',
      tabs: tabs.map(tab => tab.id),
      structure
    });
  }
  catch(error) {
    console.error(error);
  }
  await callTSTAPI({
    type: 'unblock-grouping',
    windowId
  });
}

async function collectBookmarkItems(root, recursively) {
  await ensureTSTDetected();

  let items = await browser.bookmarks.getChildren(root.id);
  if (recursively) {
    let expandedItems = [];
    for (const item of items) {
      switch (item.type) {
        case 'bookmark':
          expandedItems.push(item);
          break;
        case 'folder':
          expandedItems = expandedItems.concat(await collectBookmarkItems(item, recursively));
          break;
      }
    }
    items = expandedItems;
  }
  else {
    items = items.filter(item => item.type == 'bookmark');
  }
  if (countMatched(items, item => !DESCENDANT_MATCHER.test(item.title)) > 1) {
    for (const item of items) {
      item.title = DESCENDANT_MATCHER.test(item.title) ?
        item.title.replace(DESCENDANT_MATCHER, '>$1 ') :
        `> ${item.title}`;
    }
    items.unshift({
      title:     '',
      url:       `${configs.groupTabUrl}?title=${encodeURIComponent(root.title)}&temporaryAggressive=true`,
      discarded: false
    });
  }
  return items;
}

export async function openAllBookmarksWithStructure(id, { discarded, cookieStoreId, recursively } = {}) {
  if (typeof discarded == 'undefined')
    discarded = configs.openDiscarded;

  let [item,] = await browser.bookmarks.get(id);
  if (!item)
    return;

  if (item.type != 'folder') {
    item = await browser.bookmarks.get(item.parentId);
    if (Array.isArray(item))
      item = item[0];
  }

  const items = await collectBookmarkItems(item, recursively);

  openBookmarksWithStructure(items, { discarded, cookieStoreId });
}
