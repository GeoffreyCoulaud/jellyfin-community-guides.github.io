---
title: Get Started
description: Access Jellyfin remotely.
---

Welcome to the Jellyfin Community Guides! This is a work-in-progress project of providing high-quality documentation about topics that are not covered or out-of-scope for the [official Jellyfin documentation](https://jellyfin.org/docs/), like talking about specific DNS providers, tunnelling / VPN solutions, or various reverse proxies, and how it all ties together to set up reasonably secure remote access for Jellyfin.

## Options for making Jellyfin accessible remotely

1. **Don't**\
   If you don't feel like learning about networking and security, the best and simplest option is to not make your Jellyfin server accessible remotely at all. Don't pressure yourself into sharing your library right away - setting up Jellyfin for yourself is already really cool! You can always expand your setup later when you feel like it.
2. **Tailscale**\
   Tailscale is type of VPN, but it's different from the VPNs you might already know. You create an account on Tailscale's website and install their software on your devices and link them in a private network, allowing for example your smartphone to connect to your Jellyfin server at home from anywhere and doesn't require port forwarding. This is one of the easiest methods to get secure remote access, but has some limitations which are covered below.
3. **Headscale**\
   Headscale is very similar to Tailscale, but it's fully open-source and you need to host the control server yourself. The control server needs to be accessible (open ports) by your devices, so this is primarily relevant for people who already have a VPS in the cloud for example (or those that plan to rent one). You're not getting around port-forwarding / opening ports with this setup (strictly speaking) - it's just that you're opening ports on your Headscale control server instead of on your Jellyfin server's network (likely your home network).
4. **Wireguard**\
   Wireguard is a VPN protocol and is also used by Tailscale and Headscale, but you can also make a simpler Wireguard server/client setup yourself with fewer moving parts. This is a bit more advanced but can be very elegant. For example, you could run Wireguard on your Jellyfin server and port-forward the Wireguard port, which allows secure access to Jellyfin and your other self-hosted applications.
5. **Port-forward**\
   Port-forwarding in this context means opening a port on your router which forwards requests to your Jellyfin server or a reverse proxy sitting in front of it. This is the most convenient solution for your users because they won't need additional apps like Tailscale or Wireguard to access your Jellyfin instance, but this method requires the most effort and knowledge to set up securely. All other methods are pretty hard to configure insecurely, but with port-forwarding you should know what you're doing. We're here to help you though, and if you put in the time and effort to learn, you can also create an comfortable and secure setup for your users.

TODO: we're probably missing some options, like other tunelling solutions with user's own VPS or how cloudflare proxy isn't viable because of their ToS about bandwidth

## About reverse-proxies

You often hear about reverse-proxies in the context of making Jellyfin accessible remotely. This isn't strictly wrong, but it's also an incomplete picture. A reverse proxy doesn't make your Jellyfin accessible on its own - it's used in combination with any of the above methods. That includes "Don't" because you can use a reverse proxy just for yourself, which can still be very useful for some selfhosters.

We encourage the use of reverse proxies because they can provide a bunch of security benefits as outlined in our [reference on reverse proxies](/reference/security-measures/#reverse-proxy). We'll cover them as part of the subsequent guides.

## Comparing options

| Option       | How easy? (Securely) | No need for additional app on client | No open ports needed    |
| ------------ | -------------------- | ------------------------------------ | ----------------------- |
| Don't        | ⭐⭐⭐⭐⭐           | n/a                                  | ✅                      |
| Tailscale    | ⭐⭐⭐⭐             | ❌                                   | ✅                      |
| Headscale    | ⭐⭐⭐               | ❌                                   | ❌ (for control server) |
| Wireguard    | ⭐⭐⭐               | ❌                                   | ❌                      |
| Port-forward | ⭐                   | ✅                                   | ❌                      |
