from os.path import join, exists
from os import makedirs
from datetime import datetime
from slugify import slugify
import json 

# Get title of entry
title = input('Enter the title of the entry (mandatory): ').strip()

# Add a description for the entry
description = input('Enter the description of the blog (over 10 chars; mandatory): ').strip()

# Parse and (partially) validate the dates
date = input('Enter the year of the entry (yyyy-mm-dd, optional): ').strip()
if not date: 
    dt = datetime.now() 
    date = f'{dt.year:04d}-{dt.month:02d}-{dt.day:02d}'
year, month, day = date.split('-')
assert all(map(int, (year, month, day)))
assert 1 <= int(month) <= 21
assert 1 <= int(day) <= 31

# Get the slug for the entry 
slug = input('Enter the slug for the post (optional): ').strip()
if not slug: 
    slug = slugify(title)
assert(slug)

# Does the post have a thumbnail? 
thumbnail = input('Has thumbnail (y/n)? ').strip().lower() == 'y'

# Add tags to the entry
tags = input('List tags (in JSON format, globals include "snippet", "note", "paper", optional): ')
if tags: 
    tags = json.loads(tags)
    assert isinstance(tags, (list, tuple))
tags = tags or []
tags = ' '.join(sorted(list(set(map(slugify, tags)))))

# Does the blog have a bibtex entry associated with it? 
bibtex = input('Enter the bibtex entry (optional): ').strip()

# Build up the metadata
lines = []
lines.append(f'---')
lines.append(f'layout: post')
lines.append(f'title: {title}')
lines.append(f'description: {description}')
lines.append(f'date: {year}-{month}-{day}')
lines.append(f'author: Niall Twomey')
lines.append(f'comments: false')
if bibtex: 
    lines.append(f'bibtex: {bibtex}')
if thumbnail: 
    lines.append(f'thumb_image: {year}/{slug}/thumb.png')
lines.append(f'---')
lines.extend(f'\n')
lines.extend(f'\n')

# Ensure that the path for assets for this post exists
asset_path = join('assets', year, slug)
if not exists(asset_path): 
    makedirs(asset_path)

# Dump the contents to file
content_path = join('_drafts', f'{year}-{month}-{day}-{slug}.md')
with open(content_path, 'w') as fil: 
    fil.write('\n'.join(lines))
print(f'\n\nDraft template added to {content_path}\n')

