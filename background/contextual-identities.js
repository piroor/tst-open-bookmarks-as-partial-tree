/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import EventListenerManager from '/extlib/EventListenerManager.js';

const mContextualIdentities = new Map();
const mInitialized = new Promise(async (resolve, _reject) => {
  const identities = await browser.contextualIdentities.query({});
  for (const identity of identities) {
    mContextualIdentities.set(identity.cookieStoreId, fixupIcon(identity));
  }
  resolve();
});

export async function get(id) {
  await mInitialized;
  return mContextualIdentities.get(id);
}

export async function getIdFromName(name) {
  await mInitialized;
  for (const identity of mContextualIdentities.values()) {
    if (identity.name.toLowerCase() == name.toLowerCase())
      return identity.cookieStoreId;
  }
  return null;
}

export async function getCount() {
  await mInitialized;
  return mContextualIdentities.size;
}

export async function forEach(callback) {
  await mInitialized;
  for (const identity of mContextualIdentities.values()) {
    callback(identity);
  }
}

function fixupIcon(identity) {
  if (identity.icon && identity.color)
    identity.iconUrl = `/resources/icons/contextual-identities/${identity.icon}.svg#${identity.color}`;
  return identity;
}

export const onUpdated = new EventListenerManager();

function onContextualIdentityCreated(createdInfo) {
  const identity = createdInfo.contextualIdentity;
  mContextualIdentities.set(identity.cookieStoreId, fixupIcon(identity));
  onUpdated.dispatch();
}
browser.contextualIdentities.onCreated.addListener(onContextualIdentityCreated);

function onContextualIdentityRemoved(removedInfo) {
  const identity = removedInfo.contextualIdentity;
  delete mContextualIdentities.delete(identity.cookieStoreId);
  onUpdated.dispatch();
}
browser.contextualIdentities.onRemoved.addListener(onContextualIdentityRemoved);

function onContextualIdentityUpdated(updatedInfo) {
  const identity = updatedInfo.contextualIdentity;
  mContextualIdentities.set(identity.cookieStoreId, fixupIcon(identity));
  onUpdated.dispatch();
}
browser.contextualIdentities.onUpdated.addListener(onContextualIdentityUpdated);
