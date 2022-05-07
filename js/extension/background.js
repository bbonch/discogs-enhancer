/**
 *
 * Discogs Enhancer
 *
 * @author: Matthew Salcido
 * @website: http://www.msalcido.com
 * @github: https://github.com/salcido
 *
 * This is essentially the backbone of the extension.
 * All feature scripts and preferences are loaded/appended from here.
 * It also serves as the intermediary between Discogs and the extension's
 * popover.
 *
 */

import { ContextMenuOption } from '../shared/constants.js'

let elems = [],
  filterMonitor,
  hashes,
  prefs = {},
  resourceLibrary;

// ========================================================
// Functions
// ========================================================

/**
 * docuemnt.readyState check via promise
 * @returns {Promise}
 */
function documentReady(document) {
  return new Promise(resolve => {

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      return resolve(document);
    }

    document.addEventListener('DOMContentLoaded', () => {
      return resolve(document);
    });
  });
}

/**
 * Used to append the js/css nodes to the DOM when the
 * extension first runs.
 * @param    {Array} elems - An array of nodes to be appended
 * @return   {Promise}
 */
function appendFragment(elems) {
  let fragment = document.createDocumentFragment();

  return new Promise(resolve => {
    elems.forEach(elm => fragment.appendChild(elm));
    (document.head || document.documentElement).appendChild(fragment.cloneNode(true));
    return resolve();
  });
}

/**
 * This tracks the filter preferences so that the current
 * filtering status can be appended to the DOM whilst
 * using Everlasting Marketplace.
 * @returns {Object}
 */
function getCurrentFilterState() {
  let currentFilterState = {
    everlastingMarket: prefs.everlastingMarket,
    filterMediaCondition: prefs.filterMediaCondition,
    filterPrices: prefs.filterPrices,
    filterShippingCountry: prefs.filterShippingCountry,
    filterSleeveCondition: prefs.filterSleeveCondition,
  };
  return currentFilterState;
}

// ========================================================
// Install/Update Notifications
// ========================================================

if (typeof chrome.runtime.onInstalled !== 'undefined') {

  chrome.runtime.onInstalled.addListener(function (details) {

    let previousVersion,
      thisVersion;

    if (details.reason === 'install') {

      console.log('Welcome to the pleasuredome!');

      chrome.storage.sync.set({ didUpdate: false }, function () { });

    } else if (details.reason === 'update') {

      // - Don't show an update notice on patches -
      previousVersion = details.previousVersion.split('.');

      thisVersion = chrome.runtime.getManifest().version.split('.');

      if (Number(thisVersion[0]) > Number(previousVersion[0]) ||
        Number(thisVersion[1]) > Number(previousVersion[1])) {

        chrome.action.setBadgeText({ text: ' ' });

        chrome.action.setBadgeBackgroundColor({ color: '#4cb749' });

        chrome.storage.sync.set({ didUpdate: true }, function () { });
      }
    }
  });
}

self.getCookie = function (name) {
  var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
};

// ========================================================
//  Side A; track 1
// ========================================================

// Resource Library
// A singleton of shared methods for the extension
resourceLibrary = document.createElement('script');
resourceLibrary.type = 'text/javascript';
resourceLibrary.id = 'resource-library';
resourceLibrary.src = chrome.runtime.getURL('js/extension/dependencies/resource-library.js');

appendFragment([resourceLibrary]).then(() => {

  let blockedUsers = ['.xxTIMEMACHINExx.', 'Efx.Libris'],
    user = self.getCookie('ck_username');

  if (user && blockedUsers.includes(user)) {
    return;
  }

  // Get the users preferences or create them
  chrome.storage.sync.get('prefs', result => {

    if (!result || !result.prefs) {
      console.log('Prefs is not defined');
    }

    prefs = result.prefs;

    // Dark Theme
    if (prefs.darkTheme) document.documentElement.classList.add('de-dark-theme');
    // Don't use the dark theme on subdomains or when printing an order
    // Fixed in this file instead of manifest.json due to issues explained here:
    // https://github.com/salcido/discogs-enhancer/issues/14
    if (!self.location.href.includes('www')
      || self.location.href.includes('/order/prints?')
      || self.location.href.includes('/digs')) {

      document.documentElement.classList.remove('de-dark-theme');
    }

    return new Promise(resolve => {
      // ========================================================
      // Preference-agnostic scripts (always appended)
      // ========================================================

      // GraphQL Hashes
      hashes = document.createElement('script');
      hashes.type = 'text/javascript';
      hashes.className = 'de-init';
      hashes.src = chrome.runtime.getURL('js/extension/dependencies/hashes.js');

      elems.push(hashes);

      // Filter Monitor
      filterMonitor = document.createElement('script');
      filterMonitor.type = 'text/javascript';
      filterMonitor.className = 'de-init';
      filterMonitor.src = chrome.runtime.getURL('js/extension/features/filter-monitor.js');

      elems.push(filterMonitor);

      // update-exchange-rates.js
      let updateExchangeRates = document.createElement('script');

      updateExchangeRates.type = 'text/javascript';
      updateExchangeRates.src = chrome.runtime.getURL('js/extension/dependencies/update-exchange-rates.js');
      updateExchangeRates.className = 'de-init';

      elems.push(updateExchangeRates);

      // links-in-new-tabs.js
      let linksInTabs = document.createElement('script');

      linksInTabs.type = 'text/javascript';
      linksInTabs.src = chrome.runtime.getURL('js/extension/features/links-in-new-tabs.js');
      linksInTabs.className = 'de-init';

      elems.push(linksInTabs);

      // New Release Page Fixes
      let newReleasePageFixes = document.createElement('link');

      newReleasePageFixes.rel = 'stylesheet';
      newReleasePageFixes.type = 'text/css';
      newReleasePageFixes.href = chrome.runtime.getURL('css/new-release-page-fixes.css');
      newReleasePageFixes.id = 'newReleasePageFixes';

      elems.push(newReleasePageFixes);

      // - Toggleable CSS files -
      // --------------------------------------------------------
      // These are always appended and enabled/disabled via
      // JS so that the user can toggle them from the extension
      // menu and not have to refresh to see the effects.
      // --------------------------------------------------------

      // min-max-columns.css
      let minMax_css = document.createElement('link');

      minMax_css.rel = 'stylesheet';
      minMax_css.type = 'text/css';
      minMax_css.href = chrome.runtime.getURL('css/min-max-columns.css');
      minMax_css.id = 'minMaxColumnsCss';
      minMax_css.disabled = !result.prefs.hideMinMaxColumns;

      elems.push(minMax_css);

      // baoi-fields.css
      let baoi_css = document.createElement('link');

      baoi_css.rel = 'stylesheet';
      baoi_css.type = 'text/css';
      baoi_css.href = chrome.runtime.getURL('css/baoi-fields.css');
      baoi_css.id = 'baoiFieldsCss',
        baoi_css.disabled = !result.prefs.baoiFields;

      elems.push(baoi_css);

      // large-youtube-playlists.css
      let ytPlaylists_css = document.createElement('link');

      ytPlaylists_css.rel = 'stylesheet';
      ytPlaylists_css.type = 'text/css';
      ytPlaylists_css.href = chrome.runtime.getURL('css/large-youtube-playlists.css');
      ytPlaylists_css.id = 'ytPlaylistsCss',
        ytPlaylists_css.disabled = !result.prefs.ytPlaylists;

      elems.push(ytPlaylists_css);

      // everlasting.css
      let everlastingCss = document.createElement('link');

      everlastingCss.rel = 'stylesheet';
      everlastingCss.type = 'text/css';
      everlastingCss.href = chrome.runtime.getURL('css/everlasting.css');

      elems.push(everlastingCss);

      // Friend-counter (always enabled)
      // See comments in friend-counter.js for more details
      let friendCounter = document.createElement('script');

      friendCounter.type = 'text/javascript';
      friendCounter.className = 'de-init';
      friendCounter.src = chrome.runtime.getURL('js/extension/features/friend-counter.js');

      elems.push(friendCounter);

      // marketplace-highlights.js
      let highlightScript = document.createElement('script');

      highlightScript.type = 'text/javascript';
      highlightScript.src = chrome.runtime.getURL('js/extension/features/marketplace-highlights.js');
      highlightScript.className = 'de-init';

      elems.push(highlightScript);

      // marketplace-highlights.css
      let highlightCss = document.createElement('link');

      highlightCss.rel = 'stylesheet';
      highlightCss.type = 'text/css';
      highlightCss.href = chrome.runtime.getURL('css/marketplace-highlights.css');
      highlightCss.id = 'mediaHighLightsCss';
      highlightCss.disabled = !result.prefs.highlightMedia;

      elems.push(highlightCss);

      // ========================================================
      // Preference-dependent scripts
      // ========================================================
      //
      // Adding A Feature: Step 1

      if (result.prefs.absoluteDate) {
        // show-actual-dates.js
        let absoluteDate = document.createElement('script');

        absoluteDate.type = 'text/javascript';
        absoluteDate.src = chrome.runtime.getURL('js/extension/features/show-actual-dates.js');
        absoluteDate.className = 'de-init';

        elems.push(absoluteDate);

        let absoluteDateReact = document.createElement('script');

        absoluteDateReact.type = 'text/javascript';
        absoluteDateReact.src = chrome.runtime.getURL('js/extension/features/show-actual-dates-react.js');
        absoluteDateReact.className = 'de-init';

        elems.push(absoluteDateReact);
      }

      if (result.prefs.averagePrice) {
        // average-price.js
        let averagePrice = document.createElement('script');

        averagePrice.type = 'text/javascript';
        averagePrice.src = chrome.runtime.getURL('js/extension/features/average-price.js');
        averagePrice.className = 'de-init';

        elems.push(averagePrice);
      }

      if (result.prefs.blockBuyers) {
        // block-buyers.js
        let blockBuyers = document.createElement('script');

        blockBuyers.type = 'text/javascript';
        blockBuyers.src = chrome.runtime.getURL('js/extension/features/block-buyers.js');
        blockBuyers.className = 'de-init';

        elems.push(blockBuyers);
      }

      if (result.prefs.blockSellers) {

        // block-sellers.js
        let blockSellers = document.createElement('script');

        blockSellers.type = 'text/javascript';
        blockSellers.src = chrome.runtime.getURL('js/extension/features/block-sellers.js');
        blockSellers.className = 'de-init';

        elems.push(blockSellers);

        // blocked-seller.css
        let blockSellers_css = document.createElement('link');

        blockSellers_css.rel = 'stylesheet';
        blockSellers_css.type = 'text/css';
        blockSellers_css.href = chrome.runtime.getURL('css/blocked-seller.css');

        elems.push(blockSellers_css);
      }

      if (result.prefs.blurryImageFix) {

        // blurry-image-fix.js
        let blurryImageFix = document.createElement('script');

        blurryImageFix.type = 'text/javascript';
        blurryImageFix.className = 'de-init';
        blurryImageFix.src = chrome.runtime.getURL('js/extension/features/blurry-image-fix.js');

        elems.push(blurryImageFix);
      }

      if (result.prefs.confirmBeforeRemoving) {

        let confirmBeforeRemoving = document.createElement('script');

        confirmBeforeRemoving.type = 'text/javascript';
        confirmBeforeRemoving.src = chrome.runtime.getURL('js/extension/features/confirm-before-removing.js');
        confirmBeforeRemoving.className = 'de-init';

        elems.push(confirmBeforeRemoving);

        let confirmBeforeRemovingReact = document.createElement('script');

        confirmBeforeRemovingReact.type = 'text/javascript';
        confirmBeforeRemovingReact.src = chrome.runtime.getURL('js/extension/features/confirm-before-removing-react.js');
        confirmBeforeRemovingReact.className = 'de-init';

        elems.push(confirmBeforeRemovingReact);
      }

      if (result.prefs.collectionUi) {

        // better-collection-ui.js
        let collectionUi = document.createElement('script');

        collectionUi.type = 'text/javascript';
        collectionUi.src = chrome.runtime.getURL('js/extension/features/better-collection-ui.js');
        collectionUi.className = 'de-init';

        elems.push(collectionUi);
      }

      // comment-scanner.js
      if (result.prefs.commentScanner) {

        let commentScanner = document.createElement('script');

        commentScanner.type = 'text/javascript';
        commentScanner.src = chrome.runtime.getURL('js/extension/features/comment-scanner.js');
        commentScanner.className = 'de-init';

        elems.push(commentScanner);
      }

      if (result.prefs.converter
        && !self.location.href.includes('/order/prints?')) {

        // currency-converter.css
        let converter_css = document.createElement('link');

        converter_css.rel = 'stylesheet';
        converter_css.type = 'text/css';
        converter_css.href = chrome.runtime.getURL('css/currency-converter.css');

        elems.push(converter_css);

        // currency-converter.js
        let converter = document.createElement('script');

        converter.type = 'text/javascript';
        converter.className = 'de-init';
        converter.src = chrome.runtime.getURL('js/extension/features/currency-converter.js');

        elems.push(converter);
      }

      // release-history-legend.js
      if (result.prefs.darkTheme) {

        let releaseHistoryScript = document.createElement('script');

        releaseHistoryScript.type = 'text/javascript';
        releaseHistoryScript.src = chrome.runtime.getURL('js/extension/features/release-history-legend.js');
        releaseHistoryScript.className = 'de-init';

        elems.push(releaseHistoryScript);

        // options.js
        // The option menu is only available when the dark theme is in use
        let options = document.createElement('script');

        options.type = 'text/javascript';
        options.src = chrome.runtime.getURL('js/extension/dependencies/options.js');
        options.className = 'de-init';

        elems.push(options);
      }

      // demand-index.js
      if (result.prefs.demandIndex) {

        let demandIndex = document.createElement('script');

        demandIndex.type = 'text/javascript';
        demandIndex.src = chrome.runtime.getURL('js/extension/features/demand-index.js');
        demandIndex.className = 'de-init';

        elems.push(demandIndex);

        let demandIndexReact = document.createElement('script');

        demandIndexReact.type = 'text/javascript';
        demandIndexReact.src = chrome.runtime.getURL('js/extension/features/demand-index-react.js');
        demandIndexReact.className = 'de-init';

        elems.push(demandIndexReact);

        let demandIndexMP = document.createElement('script');

        demandIndexMP.type = 'text/javascript';
        demandIndexMP.src = chrome.runtime.getURL('js/extension/features/demand-index-marketplace.js');
        demandIndexMP.className = 'de-init';

        elems.push(demandIndexMP);
      }

      // editing notepad
      if (result.prefs.editingNotepad) {

        let editingNotepad = document.createElement('script');

        editingNotepad.type = 'text/javascript';
        editingNotepad.src = chrome.runtime.getURL('js/extension/features/editing-notepad.js');
        editingNotepad.className = 'de-init';

        elems.push(editingNotepad);
      }

      // everlasting collection
      if (result.prefs.everlastingCollection) {

        // everlasting-collection-notes.js
        let everlastingCollectionNotes = document.createElement('script');

        everlastingCollectionNotes.type = 'text/javascript';
        everlastingCollectionNotes.src = chrome.runtime.getURL('js/extension/features/everlasting-collection-notes.js');
        everlastingCollectionNotes.className = 'de-init';

        elems.push(everlastingCollectionNotes);

        // everlasting-collection-ratings.js
        let everlastingCollectionRatings = document.createElement('script');

        everlastingCollectionRatings.type = 'text/javascript';
        everlastingCollectionRatings.src = chrome.runtime.getURL('js/extension/features/everlasting-collection-ratings.js');
        everlastingCollectionRatings.className = 'de-init';

        elems.push(everlastingCollectionRatings);

        // everlasting-collection-sm-med.js
        let everlastingCollection = document.createElement('script');

        everlastingCollection.type = 'text/javascript';
        everlastingCollection.src = chrome.runtime.getURL('js/extension/features/everlasting-collection-sm-med.js');
        everlastingCollection.className = 'de-init';

        elems.push(everlastingCollection);
      }

      // everlasting marketplace
      if (result.prefs.everlastingMarket) {

        // everlasting-marketplace.js && everlasting-marketplace-release-page.js
        let everlastingMarket = document.createElement('script'),
          everlastingMarketReleases = document.createElement('script');

        everlastingMarket.type = 'text/javascript';
        everlastingMarket.src = chrome.runtime.getURL('js/extension/features/everlasting-marketplace.js');
        everlastingMarket.className = 'de-init';

        elems.push(everlastingMarket);

        everlastingMarketReleases.type = 'text/javascript';
        everlastingMarketReleases.src = chrome.runtime.getURL('js/extension/features/everlasting-marketplace-release-page.js');
        everlastingMarketReleases.className = 'de-init';

        elems.push(everlastingMarketReleases);
      }

      if (result.prefs.favoriteSellers) {

        // favorite-sellers.js
        let favoriteSellers = document.createElement('script');

        favoriteSellers.type = 'text/javascript';
        favoriteSellers.src = chrome.runtime.getURL('js/extension/features/favorite-sellers.js');
        favoriteSellers.className = 'de-init';

        elems.push(favoriteSellers);
      }

      if (result.prefs.feedback) {

        let feedback = document.createElement('script');

        feedback.type = 'text/javascript';
        feedback.src = chrome.runtime.getURL('js/extension/features/feedback-notifier.js');
        feedback.className = 'de-init';

        elems.push(feedback);

        // feedback-notifier.css
        let feedback_css = document.createElement('link');

        feedback_css.rel = 'stylesheet';
        feedback_css.type = 'text/css';
        feedback_css.href = chrome.runtime.getURL('css/feedback-notifier.css');

        elems.push(feedback_css);
      }

      if (result.prefs.filterMediaCondition) {

        // filter-media-condition.js
        let filterMediaCondition = document.createElement('script');

        filterMediaCondition.type = 'text/javascript';
        filterMediaCondition.src = chrome.runtime.getURL('js/extension/features/filter-media-condition.js');
        filterMediaCondition.className = 'de-init';

        elems.push(filterMediaCondition);
      }

      if (result.prefs.filterPrices) {

        let filterPrices = document.createElement('script');

        filterPrices.type = 'text/javascript';
        filterPrices.src = chrome.runtime.getURL('js/extension/features/filter-prices.js');
        filterPrices.className = 'de-init';

        elems.push(filterPrices);
      }

      if (result.prefs.filterShippingCountry) {

        // filter-shipping-country.js
        let filterShippingCountry = document.createElement('script');

        filterShippingCountry.type = 'text/javascript';
        filterShippingCountry.src = chrome.runtime.getURL('js/extension/features/filter-shipping-country.js');
        filterShippingCountry.className = 'de-init';

        elems.push(filterShippingCountry);
      }

      if (result.prefs.filterSleeveCondition) {

        // filter-sleeve-condition.js
        let filterSleeveCondition = document.createElement('script');

        filterSleeveCondition.type = 'text/javascript';
        filterSleeveCondition.src = chrome.runtime.getURL('js/extension/features/filter-sleeve-condition.js');
        filterSleeveCondition.className = 'de-init';

        elems.push(filterSleeveCondition);
      }

      // text format shortcuts
      if (result.prefs.formatShortcuts) {

        // text-format-shortcuts.js
        let shortcuts = document.createElement('script');

        shortcuts.type = 'text/javascript';
        shortcuts.src = chrome.runtime.getURL('js/extension/features/text-format-shortcuts.js');
        shortcuts.className = 'de-init';

        elems.push(shortcuts);

        let shortcutsReact = document.createElement('script');

        shortcutsReact.type = 'text/javascript';
        shortcutsReact.src = chrome.runtime.getURL('js/extension/features/text-format-shortcuts-react.js');
        shortcutsReact.className = 'de-init';

        elems.push(shortcutsReact);

        // text-format-shortcuts.css
        let shortcuts_css = document.createElement('link');

        shortcuts_css.rel = 'stylesheet';
        shortcuts_css.type = 'text/css';
        shortcuts_css.href = chrome.runtime.getURL('css/text-format-shortcuts.css');

        elems.push(shortcuts_css);
      }

      // force-dashboard-link.js
      if (result.prefs.forceDashboard) {

        let forceDashboard = document.createElement('script');

        forceDashboard.type = 'text/javascript';
        forceDashboard.src = chrome.runtime.getURL('js/extension/features/force-dashboard.js');
        forceDashboard.className = 'de-init';

        elems.push(forceDashboard);
      }

      // Set value for filter-media-condition.js
      if (result.prefs.filterMediaConditionValue) {

        localStorage.setItem('mediaCondition', result.prefs.filterMediaConditionValue);
      }

      // Set value for filter-sleeve-condition.js
      if (result.prefs.filterSleeveConditionValue) {

        localStorage.setItem('sleeveCondition', result.prefs.filterSleeveConditionValue);
      }

      if (result.prefs.filterUnavailable) {

        // filter-unavailable.js
        let unavailable = document.createElement('script');

        unavailable.type = 'text/javascript';
        unavailable.src = chrome.runtime.getURL('js/extension/features/filter-unavailable.js');
        unavailable.className = 'de-init';

        elems.push(unavailable);
      }

      if (result.prefs.notesCount) {

        // notes-counter.js
        let notesCount = document.createElement('script');

        notesCount.type = 'text/javascript';
        notesCount.src = chrome.runtime.getURL('js/extension/features/notes-counter.js');
        notesCount.className = 'de-init';

        elems.push(notesCount);

        let notesCountReact = document.createElement('script');

        notesCountReact.type = 'text/javascript';
        notesCountReact.src = chrome.runtime.getURL('js/extension/features/notes-counter-react.js');
        notesCountReact.className = 'de-init';

        elems.push(notesCountReact);
      }

      if (result.prefs.quickSearch) {

        // quick-search.js
        let quickSearch = document.createElement('script');

        quickSearch.type = 'text/javascript';
        quickSearch.src = chrome.runtime.getURL('js/extension/features/quick-search.js');
        quickSearch.className = 'de-init';

        elems.push(quickSearch);

        let quickSearchReact = document.createElement('script');

        quickSearchReact.type = 'text/javascript';
        quickSearchReact.src = chrome.runtime.getURL('js/extension/features/quick-search-react.js');
        quickSearchReact.className = 'de-init';

        elems.push(quickSearchReact);
      }

      if (result.prefs.inventoryRatings) {

        // inventory-ratings.js
        let inventoryRatings = document.createElement('script');

        inventoryRatings.type = 'text/javascript';
        inventoryRatings.src = chrome.runtime.getURL('js/extension/features/inventory-ratings.js');
        inventoryRatings.className = 'de-init';

        elems.push(inventoryRatings);
      }

      if (result.prefs.inventoryScanner) {

        // inventory-scanner.js
        let inventoryScanner = document.createElement('script');

        inventoryScanner.type = 'text/javascript';
        inventoryScanner.src = chrome.runtime.getURL('js/extension/features/inventory-scanner.js');
        inventoryScanner.className = 'de-init';

        elems.push(inventoryScanner);
      }

      if (result.prefs.randomItem) {

        // random-item.js
        let randomItem = document.createElement('script');

        randomItem.type = 'text/javascript';
        randomItem.src = chrome.runtime.getURL('js/extension/features/random-item.js');
        // randomItem.className = 'de-init';

        elems.push(randomItem);

        let randomItemReact = document.createElement('script');

        randomItemReact.type = 'text/javascript';
        randomItemReact.src = chrome.runtime.getURL('js/extension/features/random-item-react.js');

        elems.push(randomItemReact);
      }

      if (result.prefs.ratingPercent) {

        // rating-percent.js
        let ratingPercent = document.createElement('script');

        ratingPercent.type = 'text/javascript';
        ratingPercent.src = chrome.runtime.getURL('js/extension/features/rating-percent.js');
        ratingPercent.className = 'de-init';

        elems.push(ratingPercent);

        let ratingPercentReact = document.createElement('script');

        ratingPercentReact.type = 'text/javascript';
        ratingPercentReact.src = chrome.runtime.getURL('js/extension/features/rating-percent-react.js');
        ratingPercentReact.className = 'de-init';

        elems.push(ratingPercentReact);
      }

      if (result.prefs.readability) {

        let tracklist_css = document.createElement('link');

        tracklist_css.rel = 'stylesheet';
        tracklist_css.type = 'text/css';
        tracklist_css.href = chrome.runtime.getURL('css/tracklist-readability.css');
        tracklist_css.id = 'tracklist_css';

        elems.push(tracklist_css);

        // tracklist-readability.js
        let readability = document.createElement('script');

        readability.type = 'text/javascript';
        readability.src = chrome.runtime.getURL('js/extension/features/tracklist-readability.js');
        readability.className = 'de-init';

        elems.push(readability);

        let readabilityReact = document.createElement('script');

        readabilityReact.type = 'text/javascript';
        readabilityReact.src = chrome.runtime.getURL('js/extension/features/tracklist-readability-react.js');
        readabilityReact.className = 'de-init';

        elems.push(readabilityReact);
      }

      if (result.prefs.relativeSoldDate) {

        // relative-sold-date.js
        let relativeSoldDate = document.createElement('script');

        relativeSoldDate.type = 'text/javascript';
        relativeSoldDate.src = chrome.runtime.getURL('js/extension/features/relative-sold-date.js');
        relativeSoldDate.className = 'de-init';

        elems.push(relativeSoldDate);

        let relativeSoldDateReact = document.createElement('script');

        relativeSoldDateReact.type = 'text/javascript';
        relativeSoldDateReact.src = chrome.runtime.getURL('js/extension/features/relative-sold-date-react.js');
        relativeSoldDateReact.className = 'de-init';

        elems.push(relativeSoldDateReact);
      }

      // release-durations
      if (result.prefs.releaseDurations) {

        let releaseDurations = document.createElement('script');

        releaseDurations.type = 'text/javascript';
        releaseDurations.src = chrome.runtime.getURL('js/extension/features/release-durations.js');
        releaseDurations.className = 'de-init';

        elems.push(releaseDurations);

        let releaseDurationsReact = document.createElement('script');

        releaseDurationsReact.type = 'text/javascript';
        releaseDurationsReact.src = chrome.runtime.getURL('js/extension/features/release-durations-react.js');
        releaseDurationsReact.className = 'de-init';

        elems.push(releaseDurationsReact);
      }

      // release-ratings
      if (result.prefs.releaseRatings) {

        let releaseRatings = document.createElement('script');

        releaseRatings.type = 'text/javascript';
        releaseRatings.src = chrome.runtime.getURL('js/extension/features/release-ratings.js');
        releaseRatings.className = 'de-init';

        elems.push(releaseRatings);
      }

      // release-scanner
      if (result.prefs.releaseScanner) {

        let releaseScanner = document.createElement('script');

        releaseScanner.type = 'text/javascript';
        releaseScanner.src = chrome.runtime.getURL('js/extension/features/release-scanner.js');
        releaseScanner.className = 'de-init';

        elems.push(releaseScanner);
      }

      if (result.prefs.removeFromWantlist) {

        // remove-from-wantlist.js
        let removeFromWantlist = document.createElement('script');

        removeFromWantlist.type = 'text/javascript';
        removeFromWantlist.src = chrome.runtime.getURL('js/extension/features/remove-from-wantlist.js');
        removeFromWantlist.className = 'de-init';

        elems.push(removeFromWantlist);
      }

      if (result.prefs.sellerItemsInCart) {

        let sellerItemsInCart = document.createElement('script');

        sellerItemsInCart.type = 'text/javascript';
        sellerItemsInCart.src = chrome.runtime.getURL('js/extension/features/show-sellers-in-cart.js');
        sellerItemsInCart.className = 'de-init';

        elems.push(sellerItemsInCart);
      }

      if (result.prefs.sellerRep) {

        // seller-rep.js
        let sellerRep = document.createElement('script');

        sellerRep.type = 'text/javascript';
        sellerRep.src = chrome.runtime.getURL('js/extension/features/seller-rep.js');
        sellerRep.className = 'de-init';

        elems.push(sellerRep);
      }

      if (result.prefs.sortButtons) {

        let sortButton_css = document.createElement('link');

        sortButton_css.rel = 'stylesheet';
        sortButton_css.type = 'text/css';
        sortButton_css.href = chrome.runtime.getURL('css/sort-buttons.css');
        sortButton_css.id = 'sortButton_css';

        elems.push(sortButton_css);

        // sort-explore-lists.js
        let sortExploreScript = document.createElement('script');

        sortExploreScript.type = 'text/javascript';
        sortExploreScript.src = chrome.runtime.getURL('js/extension/features/sort-explore-lists.js');
        sortExploreScript.className = 'de-init';

        elems.push(sortExploreScript);

        // sort-marketplace-lists.js
        let sortMarketplaceScript = document.createElement('script');

        sortMarketplaceScript.type = 'text/javascript';
        sortMarketplaceScript.src = chrome.runtime.getURL('js/extension/features/sort-marketplace-lists.js');
        sortMarketplaceScript.className = 'de-init';

        elems.push(sortMarketplaceScript);

        // sort-personal-lists.js
        let sortPersonalListsScript = document.createElement('script');

        sortPersonalListsScript.type = 'text/javascript';
        sortPersonalListsScript.src = chrome.runtime.getURL('js/extension/features/sort-personal-lists.js');
        sortPersonalListsScript.className = 'de-init';

        elems.push(sortPersonalListsScript);
      }

      if (result.prefs.suggestedPrices) {
        // suggested-prices-release-page.js
        let suggestedPricesRelease = document.createElement('script');

        suggestedPricesRelease.type = 'text/javascript';
        suggestedPricesRelease.src = chrome.runtime.getURL('js/extension/features/suggested-prices-release-page.js');
        suggestedPricesRelease.className = 'de-init';

        elems.push(suggestedPricesRelease);

        // suggested-prices-single.js
        let suggestedPricesSingle = document.createElement('script');

        suggestedPricesSingle.type = 'text/javascript';
        suggestedPricesSingle.src = chrome.runtime.getURL('js/extension/features/suggested-prices-single.js');
        suggestedPricesSingle.className = 'de-init';

        elems.push(suggestedPricesSingle);

        // Preloader css
        let suggested = document.createElement('link');

        suggested.rel = 'stylesheet';
        suggested.type = 'text/css';
        suggested.href = chrome.runtime.getURL('css/suggested-prices.css');
        suggested.id = 'suggestedCss';

        elems.push(suggested);
      }

      // tweak-discriminators.js
      if (result.prefs.tweakDiscrims) {

        let tweakDiscrims = document.createElement('script');

        tweakDiscrims.type = 'text/javascript';
        tweakDiscrims.src = chrome.runtime.getURL('js/extension/features/tweak-discriminators.js');
        tweakDiscrims.className = 'de-init';

        elems.push(tweakDiscrims);

        let tweakDiscrimsReact = document.createElement('script');

        tweakDiscrimsReact.type = 'text/javascript';
        tweakDiscrimsReact.src = chrome.runtime.getURL('js/extension/features/tweak-discriminators-react.js');
        tweakDiscrimsReact.className = 'de-init';

        elems.push(tweakDiscrimsReact);
      }

      // unit-tests.js
      let unitTests = document.createElement('script');

      unitTests.type = 'text/javascript';
      unitTests.src = chrome.runtime.getURL('js/extension/dependencies/tests/unit-tests.js');
      unitTests.className = 'de-init';

      elems.push(unitTests);

      // highlight-comments.js
      let comments = document.createElement('script');

      comments.type = 'text/javascript';
      comments.src = chrome.runtime.getURL('js/extension/features/highlight-comments.js');
      comments.className = 'de-init';

      elems.push(comments);

      // ========================================================
      // Contextual Menu Options
      // ========================================================

      const sendMessageData = {
        method: 'create',
        request: 'updateContextMenu'
      }

      if (result.prefs.useAllDay) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.allDay, sendMessageData));
      }

      if (result.prefs.useBandcamp) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.bandcamp, sendMessageData));
      }

      if (result.prefs.useBeatport) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.beatport, sendMessageData));
      }

      if (result.prefs.useBoomkat) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.boomkat, sendMessageData));
      }

      if (result.prefs.useClone) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.clone, sendMessageData));
      }

      if (result.prefs.useDeejay) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.deeJay, sendMessageData));
      }

      if (result.prefs.useDiscogs) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.discogs, sendMessageData));
      }

      if (result.prefs.useEarcave) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.earcave, sendMessageData));
      }

      if (result.prefs.useGramaphone) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.gramaphone, sendMessageData));
      }

      if (result.prefs.useHardwax) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.hardwax, sendMessageData));
      }

      if (result.prefs.useJuno) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.juno, sendMessageData));
      }

      if (result.prefs.useOye) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.oye, sendMessageData));
      }

      if (result.prefs.usePhonica) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.phonica, sendMessageData));
      }

      if (result.prefs.useRateYourMusic) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.rateYourMusic, sendMessageData));
      }

      if (result.prefs.useRedeye) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.redEye, sendMessageData));
      }

      if (result.prefs.useRushhour) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.rushHour, sendMessageData));
      }
      if (result.prefs.useSotu) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.sotu, sendMessageData));
      }

      if (result.prefs.useYoutube) {
        chrome.runtime.sendMessage(Object.assign(ContextMenuOption.youTube, sendMessageData));
      }

      return resolve(result);
    })
      .then(() => {
        // Get preferences from extension side and save to DOM side.
        return new Promise(resolve => {
          chrome.runtime.sendMessage({ request: 'userPreferences' }, async response => {
            let userPreferences = {
              blockList: localStorage.getItem('blockList'),
              countryList: localStorage.getItem('countryList'),
              discriminators: localStorage.getItem('discriminators'),
              favoriteList: localStorage.getItem('favoriteList'),
              filterPrices: localStorage.getItem('filterPrices'),
              inventoryRatings: localStorage.getItem('inventoryRatings'),
              inventoryScanner: localStorage.getItem('inventoryScanner'),
              linksInTabs: localStorage.getItem('linksInTabs'),
              mediaCondition: localStorage.getItem('mediaCondition'),
              readability: localStorage.getItem('readability'),
              sellerRep: localStorage.getItem('sellerRep'),
              sellerRepColor: localStorage.getItem('sellerRepColor'),
              sellerRepFilter: localStorage.getItem('sellerRepFilter'),
              sleeveCondition: localStorage.getItem('sleeveCondition'),
              usDateFormat: localStorage.getItem('usDateFormat'),
            };

            for (let p in userPreferences) {
              userPreferences[p] = JSON.parse(userPreferences[p]);
            }

            let target = localStorage.getItem('userPreferences'),
              source = userPreferences,
              currentFilterState = getCurrentFilterState(),
              userCurrency = prefs.userCurrency,
              newPrefs;

            target = target ? JSON.parse(target) : userPreferences;
            newPrefs = Object.assign(target, source, { currentFilterState }, { userCurrency });

            return resolve(newPrefs);
          });
        });
      })
      .then(newPrefs => {
        // Instantiate default options
        return new Promise(resolve => {
          if (!Object.prototype.hasOwnProperty.call(newPrefs, 'options')) {

            let options = {
              colorize: false,
              comments: false,
              debug: false,
              quicksearch: '',
              threshold: 2,
              unitTests: false
            };

            newPrefs.options = options;
          }
          localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
          return resolve();
        });
      })
      .then(() => appendFragment(elems))
      .then(() => documentReady(self.document))
      .then(() => {
        // DOM clean up
        document.querySelectorAll('.de-init').forEach(child => {
          child.parentNode.removeChild(child);
        });
      })
      .catch(err => console.error('Error injecting scripts', err));
  });
});