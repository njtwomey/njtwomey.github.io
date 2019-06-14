from os.path import join, exists
from os import makedirs

def trim(s): 
    return s.strip()


title = input('Enter the title of the entry: ').strip()
bibtex = input('Enter the bibtex entry (leave blank): ').strip()
description = input('Enter the description: ').strip()
slug = input('Enter the shortened name (slug) of the entry: ').strip()

date = input('Enter the year of the entry (yyyy-mm-dd): ').strip()
year, month, day = date.split('-')
for d in (year, month, day): 
    int(d)

asset_path = join('assets', year, slug)
if not exists(asset_path): 
    makedirs(asset_path)

content_path = join('_posts', f'{year}-{month}-{day}-{slug}.md')
with open(content_path, 'w') as fil: 
    fil.write(f'''---
layout: post
title: "{ title }"
description: "{ description }"
thumb_image: "{ year }/{ slug }/thumb.png"
bibtex: { bibtex }
tags: ['{ year }']
---''')
