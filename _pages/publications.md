---
layout: page
permalink: /publications/
title: publications
social: true
description: This page lists my publications in reverse-chronological order. The abstracts of each entry are listed here too and will be made visible by clicking on the 'Abs' link for each entry. Additionally, where possible I have given links to download the PDF of each paper. 
years: [2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2011, 2010]
---

{% for y in page.years %}
  <h3 class="year">{{y}}</h3>
  {% bibliography -f papers -q @*[year={{y}}]* %}
{% endfor %}

