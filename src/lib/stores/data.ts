import type { Profile } from '$lib/types/profile';
import { Page } from '$lib/types';
import { get, readable, writable, type Writable, type Readable } from 'svelte/store';
import type { Tabs } from 'webextension-polyfill';
import { BrowserUtil, ProfileUtil } from '$lib/utility';
import type { Duration, SessionManager } from '$lib/types';
import { urlToScope } from '$lib/utility/utils';
import { sessionController } from '$lib/controllers/session.controller';
import { browserController } from '$lib/controllers';
import { web } from '$lib/utility';

const userProfile: Writable<Profile> = writable({});
const profiles: Writable<Profile[]> = writable([]);
const duration: Writable<Duration> = writable({
	name: 'One time',
	value: 0
});
const theme: Writable<string> = writable('dark');
const backupCompleted: Writable<boolean> = writable(false);
const currentPage: Writable<Page> = writable(Page.Home);

const isAlways: Writable<boolean> = writable(false);
const isAccepted: Writable<boolean> = writable(false);

// Reactive store for current tab that updates on navigation
const currentTab: Writable<Tabs.Tab | undefined> = writable(undefined);

// Initialize current tab and set up listeners
if (typeof document !== 'undefined') {
	// Initial fetch
	BrowserUtil.getCurrentTab().then((tab) => {
		currentTab.set(tab);
	});

	// Listen for tab activation changes
	web.tabs.onActivated.addListener(async (activeInfo) => {
		const tab = await web.tabs.get(activeInfo.tabId);
		currentTab.set(tab);
	});

	// Listen for URL changes within the same tab
	web.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
		if (changeInfo.url || changeInfo.status === 'complete') {
			// Check if this is the active tab
			const activeTab = await BrowserUtil.getCurrentTab();
			if (activeTab && activeTab.id === tabId) {
				currentTab.set(tab);
			}
		}
	});
}

// Reactive store for current domain
const currentDomain: Readable<string> = {
	subscribe: (run) => {
		return currentTab.subscribe((tab) => {
			run(urlToScope(tab?.url || ''));
		});
	}
};

const timeStop = readable(new Date(), (set) => {
	let interval: ReturnType<typeof setInterval> | undefined;

	const unsubscribe = currentDomain.subscribe((domain) => {
		// Clear previous interval when domain changes
		if (interval) clearInterval(interval);

		if (!domain) {
			isAccepted.set(false);
			isAlways.set(false);
			set(new Date());
			return;
		}

		const updatePermission = () => {
			const permission = ProfileUtil.getWebSiteOrCreate(domain, get(userProfile))?.permission;
			isAccepted.set(permission?.accept || false);
			if (permission?.always) {
				isAlways.set(true);
				set(new Date());
			} else {
				isAlways.set(false);
				set(new Date(permission?.authorizationStop || '') || new Date());
			}
		};

		// Initial update
		updatePermission();

		// Set up interval for this domain
		interval = setInterval(updatePermission, 500);
	});

	return () => {
		unsubscribe();
		if (interval) clearInterval(interval);
	};
});

let sessionData: SessionManager;
if (typeof document !== 'undefined') sessionData = sessionController();
else sessionData = { getById: async () => Promise.resolve({}) };

export {
	currentPage,
	currentTab,
	currentDomain,
	backupCompleted,
	duration,
	isAccepted,
	isAlways,
	profiles,
	timeStop,
	theme,
	userProfile,
	browserController as browser,
	sessionData
};
