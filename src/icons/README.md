# Icons

`svg/` holds one icon per tool a guide covers, and nothing else: pages that
document a task rather than a product carry no icon.

## Logos

The eleven tool logos come from [selfhst/icons](https://github.com/selfhst/icons),
a collection of square, full-colour marks for self-hosted software:
`https://cdn.jsdelivr.net/gh/selfhst/icons/svg/<name>.svg`. One source keeps them
optically consistent; each mark remains the trademark of its project, used here
to point at that project's guide.

To refresh one, download it again under the same file name. Nothing else needs
touching: `emblems.ts` finds the file by name and fails the build if it is gone.

## The DIY icon

`port-forward`, `ipv6` and `vps-plus-tunnel` are not anyone's product, so no logo
exists to be faithful to. The three share `diy.svg`, the hammer and wrench from
[Material Design Icons](https://pictogrammers.com/library/mdi/icon/hammer-wrench/)
(Apache 2.0), recoloured to the neutral slate the tile expects.

## Pips

`pips/` holds the small glyphs that tell two options of the same tool apart. They
are drawn as CSS masks, so their colour comes from the page, not from the file.
