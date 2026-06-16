/* OurSpace PortalCurrency v1
   Copper/silver/gold/platinum private in-site currency helper.
*/
window.PortalCurrency = (() => {
  const rates = {
    copper: 1,
    silver: 10,
    gold: 100,
    platinum: 1000
  };

  function toCopper(value = {}) {
    if (typeof value === 'number') {
      return Math.max(0, Math.round(value || 0));
    }

    if (value && typeof value === 'object') {
      if (value.totalCopper !== undefined) return toCopper(Number(value.totalCopper));
      if (value.rewardTotalCopper !== undefined) return toCopper(Number(value.rewardTotalCopper));
      if (value.priceTotalCopper !== undefined) return toCopper(Number(value.priceTotalCopper));

      return Math.max(
        0,
        Math.round(
          (Number(value.copper) || 0) +
          (Number(value.silver) || 0) * 10 +
          (Number(value.gold) || 0) * 100 +
          (Number(value.platinum) || 0) * 1000
        )
      );
    }

    return 0;
  }

  function fromCopper(total) {
    total = Math.max(0, Math.round(Number(total) || 0));

    const platinum = Math.floor(total / 1000);
    total %= 1000;

    const gold = Math.floor(total / 100);
    total %= 100;

    const silver = Math.floor(total / 10);
    total %= 10;

    const copper = total;

    return { platinum, gold, silver, copper };
  }

  function label(count, singular) {
    return `${count} ${singular}${count === 1 ? '' : ''}`;
  }

  function formatCopper(total) {
    const c = fromCopper(total);
    const parts = [];

    if (c.platinum) parts.push(label(c.platinum, 'platinum'));
    if (c.gold) parts.push(label(c.gold, 'gold'));
    if (c.silver) parts.push(label(c.silver, 'silver'));
    if (c.copper || parts.length === 0) parts.push(label(c.copper, 'copper'));

    return parts.join(', ');
  }

  function formatReward(totalCopper) {
    return formatCopper(totalCopper);
  }

  function formatObj(obj) {
    return formatCopper(toCopper(obj));
  }

  function normalizeValue(value) {
    return {
      totalCopper: toCopper(value),
      display: formatCopper(toCopper(value)),
      ...fromCopper(toCopper(value))
    };
  }

  function add(profileId, amountObj, reason, meta = {}) {
    const delta = toCopper(amountObj);
    if (!delta) return PortalStorage.getProfile(profileId).currencyCopper;

    return PortalStorage.updateProfile(profileId, profile => {
      profile.currencyCopper += delta;

      const entry = {
        type: 'currency-earned',
        reason,
        amountCopper: delta,
        amount: fromCopper(delta),
        display: formatCopper(delta),
        at: new Date().toISOString(),
        category: meta.category || 'activity',
        source: meta.source || 'portal',
        detail: meta.detail || {}
      };

      profile.completed.unshift(entry);
      profile.completed = profile.completed.slice(0, 1000);

      if (window.OurSpaceCurrency && typeof window.OurSpaceCurrency.award === 'function') {
        window.OurSpaceCurrency.award({
          source: meta.source || 'portal-activity',
          category: meta.category || 'activity',
          profile: profileId,
          gameId: meta.gameId || 'activity',
          gameName: meta.gameName || 'OurSpace Activity',
          eventId: meta.eventId || entry.type,
          label: reason,
          totalCopper: delta,
          detail: Object.assign({ portalSynced: true }, meta.detail || {})
        });
      }

      return profile.currencyCopper;
    });
  }

  function spend(profileId, copper, reason, meta = {}) {
    copper = toCopper(copper);

    return PortalStorage.updateProfile(profileId, profile => {
      if (profile.currencyCopper < copper) {
        throw new Error(
          `Not enough currency. Need ${formatCopper(copper)} but only have ${formatCopper(profile.currencyCopper)}.`
        );
      }

      profile.currencyCopper -= copper;

      const entry = {
        type: 'currency-spent',
        reason,
        amountCopper: copper,
        amount: fromCopper(copper),
        display: formatCopper(copper),
        at: new Date().toISOString(),
        category: meta.category || 'spending',
        source: meta.source || 'portal'
      };
      profile.completed.unshift(entry);
      profile.completed = profile.completed.slice(0, 1000);

      if (window.OurSpaceCurrency && typeof window.OurSpaceCurrency.spend === 'function') {
        window.OurSpaceCurrency.spend({
          source: meta.source || 'portal-spend',
          category: meta.category || 'spending',
          profile: profileId,
          reason,
          totalCopper: copper,
          detail: Object.assign({ portalSynced: true }, meta.detail || {})
        });
      }

      return profile.currencyCopper;
    });
  }

  return {
    rates,
    toCopper,
    fromCopper,
    formatCopper,
    formatReward,
    formatObj,
    normalizeValue,
    add,
    spend
  };
})();
