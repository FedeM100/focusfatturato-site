# Backup veloce (cartella `site/`)

## Fare un backup
Da root progetto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-site.ps1
```

Genera uno zip in `backups/` e aggiorna `backups/latest-site.zip`.

Se ti dà errore "file in uso", chiudi eventuali preview/live server che stanno scrivendo su `site/` e rilancia.

## Ripristinare (torna indietro)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore-site.ps1
```

Per default ripristina da `backups/latest-site.zip` e prima crea un backup automatico dello stato attuale.

Se vuoi ripristinare senza creare il backup automatico:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore-site.ps1 -NoBackupCurrent
```
