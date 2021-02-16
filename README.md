# pm2-pull-reload

Synchronize all applications managed by PM2 + Git/Subversion/Mercurial automatically.

Module checks each process for versioning and process status 'online'. 

Runs npm install and npm run build reloading the process.

Turn off watch in pm2 for this process to prevent double reloading.

```
# Install

$ pm2 install pm2-pull-reload

## Uninstall

$ pm2 uninstall pm2-pull-reload

## Configure pull and reload interval

$ pm2 set pm2-pull-reload:interval 60000
```

# License

MIT