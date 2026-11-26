// Retry the exact same Git commit, never the Telegram delivery itself.
export function publishStateCommit({commit, parent, push, readHead, sleep, attempts = 4}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {push(commit); return;} catch {
      let head;
      try {head = readHead();} catch { /* A failed read can also be transient. */ }
      if (head === commit) return; // Push reached GitHub but its response was lost.
      if (head !== undefined && head !== parent) throw Error('L’estat de Telegram ha canviat en una altra execució. No se sobreescriu.');
      if (attempt === attempts - 1) throw Error('No s’ha pogut guardar l’estat de Telegram després de quatre intents. Consulta l’artefacte telegram-delivery-state abans de reprendre.');
      sleep([1000, 3000, 7000][attempt] || 7000);
    }
  }
}
