import { getDuration, urlToDomain, urlToScope } from '$lib/utility';
import { web } from '$lib/utility';
import type { Tabs, Windows } from 'webextension-polyfill';

import type { Browser, Profile, WebSite } from '$lib/types';
import { backgroundController } from './background.controller';
import { isStorageLockedError } from '$lib/utility/crypto-utils';

const createBrowserController = (): Browser => {
	const getOriginPattern = (url: string): string | null => {
		const scope = urlToScope(url);
		if (!scope.startsWith('http://') && !scope.startsWith('https://')) return null;
		return `${scope}/*`;
	};

	const get = async (key: string): Promise<{ [key: string]: unknown }> => {
		try {
			const result = await web?.storage?.local?.get(key);
			return result;
		} catch (err) {
			return Promise.reject(err);
		}
	};
	const set = async (items: { [key: string]: unknown }): Promise<void> => {
		try {
			const result = await web?.storage?.local?.set(items);
			return result;
		} catch (err) {
			return Promise.reject(err);
		}
	};

	const getCurrentTab = async (): Promise<Tabs.Tab> => {
		const tabs = await web.tabs.query({ active: true, currentWindow: true });
		return tabs[0];
	};
	const injectJsInTab = async (tab: Tabs.Tab, jsFileName: string): Promise<void> => {
		try {
			// Use scripting API for Chrome (MV3) or tabs.executeScript for Firefox (MV2)
			if (web.scripting) {
				await web.scripting.executeScript({
					target: { tabId: tab.id as number },
					files: [jsFileName]
				});
			} else if (web.tabs.executeScript) {
				await web.tabs.executeScript(tab.id as number, {
					file: jsFileName
				});
			}
			return;
		} catch (e) {
			// Check if this is a "No tab with id" error - which can happen if tab was closed
			if (e instanceof Error && e.message && e.message.includes('No tab with id')) {
				// Tab was closed, we can safely ignore this error
				return;
			}

			// Check if this is an extensions gallery error or other restricted page
			if (e instanceof Error && e.message &&
				(e.message.includes('extensions gallery cannot be scripted') ||
				 e.message.includes('Missing host permission') ||
				 e.message.includes('Cannot access') ||
				 e.message.includes('restricted') ||
				 e.message.includes('chrome://') ||
				 e.message.includes('chrome-extension://') ||
				 e.message.includes('moz-extension://') ||
				 e.message.includes('about:'))) {
				// These are expected errors for restricted pages, ignore silently
				return;
			}

			console.error('Error injecting Nostr Provider', e);
			return Promise.reject(e);
		}
	};
	const injectJsinAllTabs = async (jsFileName: string): Promise<void> => {
		const tabs = await web.tabs.query({});
		for (const tab of tabs) {
			try {
				// Skip Chrome internal pages, extensions, and other special URLs
				if (!tab.url || 
					tab.url.startsWith('chrome://') || 
					tab.url.startsWith('chrome-extension://') ||
					tab.url.startsWith('moz-extension://') ||
					tab.url.startsWith('edge-extension://') ||
					tab.url.startsWith('about:') ||
					tab.url.startsWith('file://') ||
					tab.url === 'about:blank')
					continue;
				await injectJsInTab(tab, jsFileName);
			} catch {}
		}
	};
	const hasSiteAccess = async (url: string): Promise<boolean> => {
		const originPattern = getOriginPattern(url);
		if (!originPattern) return false;
		if (!web.permissions?.contains) return true;
		return web.permissions.contains({ origins: [originPattern] });
	};
	const requestSiteAccess = async (url: string): Promise<boolean> => {
		const originPattern = getOriginPattern(url);
		if (!originPattern || !web.permissions?.request) return false;
		const granted = await web.permissions.request({ origins: [originPattern] });
		if (!granted) return false;

		const tab = await getCurrentTab();
		if (tab?.id) await injectJsInTab(tab, 'content.js');
		return true;
	};
	const switchIcon = async (activeInfo: { tabId: number }) => {
		const actionApi = web.action || web.browserAction;
		if (!actionApi) return;
		try {
			// Attempt to get the tab - this will fail if the tab no longer exists
			const tab = await web.tabs.get(activeInfo.tabId);
			const user: Profile = await backgroundController().getUserProfile();
				const scope = urlToScope(tab.url || '');
				const legacyDomain = urlToDomain(tab.url || '');
				const webSites = user.data?.webSites as { [key: string]: WebSite };

				if (webSites !== undefined && (scope in webSites || legacyDomain in webSites)) {
					actionApi.setIcon({
						tabId: tab.id,
						path: 'assets/logo-on.png'
				});
			} else {
				actionApi.setIcon({
					tabId: tab.id,
					path: 'assets/logo-off.png'
				});
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes('No tab with id')) {
				return;
			}
			// Silently ignore action API errors on Firefox
			if (error instanceof Error && error.message.includes('action is undefined')) {
				return;
			}
			if (isStorageLockedError(error)) {
				actionApi.setIcon({
					tabId: activeInfo.tabId,
					path: 'assets/logo-off.png'
				});
				return;
			}
			throw error;
		}
	};
	const createWindow = async (url: string): Promise<Windows.Window> => {
		return web.windows.create({
			url: web.runtime.getURL(url),
			width: 400,
			height: 580,
			type: 'popup'
		});
	};

	const sendAuthorizationResponse = (
		yes: boolean,
		choice: number,
		url: string | undefined,
		requestId: string | undefined
	) => {
		if (!requestId) return Promise.resolve();

		getCurrentTab().then((tab) => switchIcon({ tabId: tab.id as number }));
		
		const message = {
			prompt: true,
			response: {
				status: yes ? 'success' : 'error',
				error: !yes,
				permission: {
					always: choice === 1,
					duration: getDuration(choice),
					accept: yes,
					reject: !yes
				}
			},
			ext: 'keys.band',
			url,
			requestId
		};

		return web.runtime.sendMessage(message);
	};

	return {
		get,
		set,
		getCurrentTab,
		injectJsInTab,
		injectJsinAllTabs,
		hasSiteAccess,
		requestSiteAccess,
		createWindow,
		sendAuthorizationResponse,
		switchIcon
	};
};

export const browserController: Browser = createBrowserController();
