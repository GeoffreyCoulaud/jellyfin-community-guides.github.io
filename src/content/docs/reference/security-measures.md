---
title: Security measures
---

# WORK IN PROGRESS! Just a very early first draft!

## Reverse proxy

A reverse proxy is a service that sits in front of your other applications, like Jellyfin. Through port-forwarding or other methods you direct traffic to the reverse proxy instead of the app directly. A reverse proxy allows you to specify how traffic is handled, which applications are available, handle TLS (HTTPS) and more.

### What it can protect against

- unencrypted traffic when TLS is set up (with HTTPS auto-upgrade), protecting against eavesdropping and man-in-the-middle attacks
- unwanted/banned IP-ranges (depends on the implementation, see also #Crowdsec and #Geoblocking)
- issues caused by having to open multiple ports by allowing a single port and proxying requests by subdomain or path
- denial-of-service attacks through rate-limiting (though a large-scale DDoS attack will likely still take down your server)
- access and authorization issues of services with poor native authentication by using an external authentication system like Authentik, Keycloak, or Authelia

## Geoblocking

Geoblocking is when you block countries or regions based on their IP ranges. This is not strictly a security measure and instead more of an obfuscation measure, similar to using uncommon ports. We're still including it can o a "security measures" page because your logs will be cleaner and you can spot suspicious activity much more easily and react to it.

### What it can protect against

- unwanted traffic from certain regions, which can reduce spam/noise in your logs and make targeted attacks and other issues in your setup stand out more
- reduces likelyness of having your services listed on search engines like Shodan

## Crowdsec

Crowdsec is like a distributed firewall. Users of Crowdsec exchange information about malicious IPs and other threats, which allows you to block them on your own setup.

### What it can protect against

- malicious or suspicious traffic, bots

## Fail2ban

Fail2ban is similar to Crowdsec, but isn't distributed. You configure rules like "if a client makes 5 failed login attempts in 10 minutes, block them for 1 hour" and Fail2ban will monitor your logs and block IPs that match those rules.

### What it can protect against

- malicious or suspicious traffic, bots

## Dynamic DNS (DynDNS)

todo

## IDS / IPS / WAFs

todo (Suricata, Snort? idk how feasible these are for self-hosters)

## VLANs, subnetting, firewall rules

todo

## Jellyfin 2FA/MFA

todo

## Jellyfin SSO

todo

## Password managers

todo. _very_ generic but honestly so important that imho we need to mention it because it's like the first step to decent security to have non-repeating and strong passwords.

## (Auto-) Updates

todo. i think we should mention watchtower (and that the original is outdated but there's an active fork) and also the risks involved with fully automatic updates. there are also gitops workflows with pull requests or things like dockge, diun, komodo etc etc. maybe also mention auto-updates for debian based systems. also mention version pinning and `:latest` for docker.

## Snapshots and backups

todo. maybe a small aside on what backup solutions there are, like file-based ones like borg or restic, and dataset-based ones like BTRFS or ZFS (when sending snapshots to a backup server). also mention append-only backups as a security measure against ransomware or hacks that attempt to wipe everything including backups.

## Local encryption

todo. disk encryption like LUKS/cryptsetup, BTRFS, ZFS, bitlocker (?) etc. to protect against data exposure when hardware is stolen or lost.

## Virtual machines and containerization

todo. docker, podman, LXC, proxmox, rootless containers, protect docker socket, docker networks/networking, docker-compose.yaml best practises like .env files, secrets management, inline secrets encryption, etc

## SELinux / AppArmor

todo. pretty advanced tbh - i couldn't write anything meaningful about this other than "you can look into this if you feel like it" but in my own journey so far i've only burned myself on these and turned them off after some time.

## Do things rootless

todo. rootless containers, rootless systemd (or other init systems) services, proper user configuration on linux etc, encouraging sudo over ssh+root, encourage dedicated low-privilege service accounts, etc

## Monitoring and logging

todo, some keywords to consider:

- grafana
- prometheus
- loki
- journalctl
- glances
- htop
- ntfy.sh / healthchecks.io
- gotify
- uptime kuma
-
