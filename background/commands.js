/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs
} from '/common/common.js';

const TST_ID = 'treestyletab@piro.sakura.ne.jp';


const DESCENDANT_MATCHER = /^(>+) /;

const FORBIDDEN_URL_MATCHER = /^(about|chrome|resource|file):/;
const ALLOWED_URL_MATCHER = /^about:blank(\?|$)/;


export async function openBookmarksWithStructure(items, { activeIndex = 0, discarded, cookieStoreId } = {}) {
  if (typeof discarded == 'undefined')
    discarded = configs.openDiscarded;

  const lastItemIndicesWithLevel = new Map();
  let lastMaxLevel = 0;
  const structure = items.reduce((result, item, index) => {
    if (item.url &&
        FORBIDDEN_URL_MATCHER.test(item.url) &&
        !ALLOWED_URL_MATCHER.test(item.url))
      item.url = `about:blank?${item.url}`;

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

  const window   = await browser.windows.getCurrent({ populate: true });
  const windowId = window.id;

  const firstTab = await browser.tabs.create({
    windowId,
    url:    items[0].url,
    active: true
  });

  const tabs = [firstTab];
  let offset = 0;
  for (const item of items.slice(1)) {
    const params = {
      title: item.title,
      url:   item.url,
      windowId,
      discarded
    };
    if (/^about:/.test(params.url))
      params.discarded = false; // discarded tab cannot be opened with any about: URL
    if (!params.discarded) // title cannot be set for non-discarded tabs
      params.title = null;
    params.index = firstTab.index + (++offset);
    if (cookieStoreId)
      params.cookieStoreId = options.cookieStoreId;
    tabs.push(await browser.tabs.create(params));
  }

  await browser.runtime.sendMessage(TST_ID, {
    type: 'set-tree-structure',
    tabs: tabs.map(tab => tab.id),
    structure
  });
}
