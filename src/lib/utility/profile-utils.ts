import type { PermissionDuration, Profile, WebSite } from "$lib/types";

const createNewWebSite = (): WebSite => {
    return {
        auth: false,
        permission: {
            always: false,
            accept: false,
            reject: false,
            authorizationStop: new Date().toString()
        },
        permissions: {},
        history: []
    }
}

const getLegacyHostFromScope = (scope: string): string => {
    try {
        return new URL(scope).hostname;
    } catch {
        return '';
    }
}

const getWebSiteOrCreate = (domain: string, profile: Profile): WebSite => {
    let site;
    if (profile.data?.webSites) {
        site = profile.data?.webSites[domain];

        if (!site && domain.includes('://')) {
            const legacyHost = getLegacyHostFromScope(domain);
            if (legacyHost) site = profile.data?.webSites[legacyHost];
        }

        if (!site) site = createNewWebSite();
    } else {
        site = createNewWebSite();
    }

    if (!site.permissions) {
        site.permissions = {};
        if (site.permission) {
            site.permissions.permission = site.permission;
        }
    }

    return site;
}

const getNewWebSitePermission = (
    duration: PermissionDuration,
    site: WebSite,
    type: string = 'permission'
): WebSite => {
    const newSite = { ...site };
    const permission = {
        always: duration.always,
        accept: duration.accept,
        reject: duration.reject,
        authorizationStop: duration.duration.toString()
    };

    if (type === 'permission') newSite.permission = permission;
    newSite.permissions = { ...(site.permissions || {}), [type]: permission };
    return newSite;
}

export { getWebSiteOrCreate, getNewWebSitePermission }
