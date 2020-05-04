/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  countMatched,
  configs
} from '/common/common.js';

import * as ContextualIdentities from './contextual-identities.js';

const TST_ID = 'treestyletab@piro.sakura.ne.jp';


const DESCENDANT_MATCHER = /^(>+) /;

const FORBIDDEN_URL_MATCHER = /^(about|chrome|resource|file):/;
const ALLOWED_URL_MATCHER = /^about:blank(\?|$)/;
const GROUP_TAB_MATCHER = /^ext\+treestyletab:group/;


export async function openBookmarksWithStructure(items, { discarded, cookieStoreId } = {}) {
  if (typeof discarded == 'undefined')
    discarded = configs.openDiscarded;

  const lastItemIndicesWithLevel = new Map();
  let lastMaxLevel = 0;
  const promisedCookieStoreIds = [];
  const containerMatcher = new RegExp(`#${configs.containerRedirectKey}-(.+)$`);
  const structure = items.reduce((result, item, index) => {
    if (item.url) {
      // Respect container type stored by Container Bookmarks
      // https://addons.mozilla.org/firefox/addon/container-bookmarks/
      const matchedContainer = item.url.match(containerMatcher);
      if (matchedContainer) {
        promisedCookieStoreIds.push(ContextualIdentities.getIdFromName(decodeURIComponent(matchedContainer[matchedContainer.length-1])));
      }
      else {
        promisedCookieStoreIds.push(null);
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

  const [window, ...cookieStoreIds] = await Promise.all([
    browser.windows.getCurrent({ populate: true }),
    ...promisedCookieStoreIds
  ]);

  const firstRegularItemIndex = items.findIndex(item => !GROUP_TAB_MATCHER.test(item.url));

  const windowId = window.id;
  await browser.runtime.sendMessage(TST_ID, {
    type: 'block-grouping',
    windowId
  });

  try {
    const firstTab = await browser.tabs.create({
      windowId,
      url:       items[0].url,
      active:    firstRegularItemIndex == 0,
      discarded: discarded && firstRegularItemIndex != 0 && !GROUP_TAB_MATCHER.test(items[0].url),
      cookieStoreId: cookieStoreId || cookieStoreIds[0]
    });

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
        cookieStoreId: cookieStoreId || cookieStoreIds[offset]
      };
      if (params.active ||
          GROUP_TAB_MATCHER.test(params.url) ||
          /^about:/.test(params.url)) // discarded tab cannot be opened with any about: URL
        params.discarded = false;
      if (!params.discarded) // title cannot be set for non-discarded tabs
        params.title = null;
      tabs.push(await browser.tabs.create(params));
    }

    await browser.runtime.sendMessage(TST_ID, {
      type: 'set-tree-structure',
      tabs: tabs.map(tab => tab.id),
      structure
    });
  }
  catch(error) {
    console.error(error);
  }
  await browser.runtime.sendMessage(TST_ID, {
    type: 'unblock-grouping',
    windowId
  });
}

async function collectBookmarkItems(root, recursively) {
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
      url:       `ext+treestyletab:group?title=${encodeURIComponent(root.title)}&temporaryAggressive=true`,
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
