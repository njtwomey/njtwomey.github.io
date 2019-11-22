---
layout: post
title: Eager exception logging in Python
description: Recently I've been spending more time introducing best practise with Python, and particularly I have started logging. I've actually become quite positive about logging and have (several times) found it vital to debugging the errors in my code. I did find in several occasions that there was a particular pattern that was missing in the intersection of logging and exception handling that I've come to think of as 'eager exception logging'. The key difference to this and other <a href="https://www.loggly.com/blog/exceptional-logging-of-exceptions-in-python/">exception patterns</a> is that I want to raise and log the exception at the same time. 
date: 2019-11-22
author: Niall Twomey
comments: false
tags: 2019 python snippet
---

I am writing a large library for human activity recognition from sensor data at the moment. The library will hopefully be sufficiently generic to allow for a broad range of representation and prediction capabilities as well as delivering some kind of insight into the datasets and problems under consideration. However, every dataset is slightly different, and a pipeline that has been crafted for fusing a dataset consisting of wearable, video, environmental, electricity data streams is almost certainly going to fail (or at least not operate as expected) when applied to another dataset that only has wearable data, for example. Therefore, I do a reasonable amount of metadata validation: datasets are tagged as having (or not) particular data modalities, and pipelines likewise tag their requirements in terms of data modalities, and I insist that datasets provide the capabilities required by the various functions that I write. 

The example code below gives a flavour for how some of these checks might be implemented:

```python
def do_something_with_wearable_data(dataset_name):
    meta = load_dataset_meta(dataset_name) 
    
    if not meta.has_modality('wearable'): 
        raise ValueError(
            f'The dataset {dataset_name} does not have the wearable modality.'
        )
```

Since in the intro to this I also mentioned that I'm trying to use system logging (a great idea in large projects) the code above was modified to something like this at one stage: 

```python
from logger import get_logger

logger = get_logger(__name__)

def do_something_with_wearable_data(dataset_name):
    meta = load_dataset_meta(dataset_name) 
    
    if not meta.has_modality('wearable'): 
        msg = f'The dataset {dataset_name} does not have the wearable modality.'
        logger.exception(msg)
        raise ValueError(msg)
```

I presume anybody that's familiar with the `logger.exception` will agree that this is useless code since it doesn't do what you'd hope it would. The `logger.exception` method is meant to be called when an exception has already been raised. Therefore, the code above will not log anything of use. If you'd like to get the stack trace, as well as the exception type, you'd need to do something like the following (I'm sure there's a better way, but I haven't come across one yet): 

```python
from logger import get_logger

logger = get_logger(__name__)

def do_something_with_wearable_data(dataset_name):
    meta = load_dataset_meta(dataset_name) 
    
    if not meta.has_modality('wearable'): 
        ex = ValueError(
            f'The dataset {dataset_name} does not have the wearable modality.'
        )
        
        try: 
            raise ex
        except Exception as ex: 
            logger.exception(ex)
            raise ex
```

This pattern is so ugly that it should be hidden away deep in the library (if used at all) and certainly should never be duplicated in every function that wants it. 

When thinking about what kind of interface I would *like* to use to get the behaviour I want, I thought the following pattern would be quite acceptable: 

```python
from logger import get_logger

logger = get_logger(__name__)

def do_something_with_wearable_data(dataset_name):
    meta = load_dataset_meta(dataset_name) 
    
    if not meta.has_modality('wearable'): 
        logger.exception(ValueError(
            f'The dataset {dataset_name} does not have the wearable modality.'
        ))
```

The only change is that the `msg` argument is now allowed to be an exception, and the call to `logger.exception` would raise this for me. 

I felt it would be tricky to ensure all edge cases were satisfied by sub-classing the base logger class since internally there's quite a lot of logic surrounding instantiation of loggers (see `Logger.manager.getLogger` in `logging.__init__.py`). I also wanted the interface to this new form of exception logging to be transparent to my use cases (so that I wouldn't have to import specific new functions). 

The solution I eventually came up with is to write a factory function the delivers the behaviour I want, and to re-assign the `logger.exception` function in the `get_logger` function. 

```python
def logger_exception(logger):
    str_exception = logger.exception
    
    def exception(msg, *args, exc_info=True, **kwargs):
        if not isinstance(msg, Exception):
            logger.warn(
                f'logger.exception called outside of Exception scope'
            )
            msg = Exception(msg)
        try:
            raise msg
        except Exception as ex:
            str_exception(msg, *args, exc_info=exc_info, **kwargs)
            raise ex
    
    return exception

def get_logger(logger_name):
    logger = logging.getLogger(logger_name)
    
    # Set up the level sensitivity, output handlers etc
    
    logger.exception = logger_exception(logger)  # *** here ***
    
    return logger
```

Where the line marked with `*** here ***` over-writes the behaviour of the original `logger.exception` implementation. 

Here's how it behaves with some basic examples: 

```python
In [1]: from logger import get_logger

In [2]: logger = get_logger(__name__)



In [3]: logger.exception('This is not an exception')
2019-11-22 15:37:59,751 - __main__ - WARNING - logger.exception called outside of Exception scope
2019-11-22 15:37:59,752 - __main__ - ERROR - This is not an exception
Traceback (most recent call last):
  File "/path/to/project/logger.py", line 34, in exception
    raise msg
Exception: This is not an exception
---------------------------------------------------------------------------
Exception                                 Traceback (most recent call last)
<ipython-input-3-9bddc6dd8c75> in <module>
----> 1 logger.exception('This is not an exception')

~/path/to/project/logger.py in exception(msg, exc_info, *args, **kwargs)
     35         except Exception as ex:
     36             str_exception(msg, *args, exc_info=exc_info, **kwargs)
---> 37             raise ex
     38
     39     return exception

~/path/to/project/logger.py in exception(msg, exc_info, *args, **kwargs)
     32             msg = Exception(msg)
     33         try:
---> 34             raise msg
     35         except Exception as ex:
     36             str_exception(msg, *args, exc_info=exc_info, **kwargs)

Exception: This is not an exception



In [4]: logger.exception(ValueError('This is an exception'))
2019-11-22 15:38:03,070 - __main__ - ERROR - This is an exception
Traceback (most recent call last):
  File "/path/to/project/logger.py", line 34, in exception
    raise msg
ValueError: This is an exception
---------------------------------------------------------------------------
ValueError                                Traceback (most recent call last)
<ipython-input-4-cf57a53947e6> in <module>
----> 1 logger.exception(ValueError('This is an exception'))

~/path/to/project/logger.py in exception(msg, exc_info, *args, **kwargs)
     35         except Exception as ex:
     36             str_exception(msg, *args, exc_info=exc_info, **kwargs)
---> 37             raise ex
     38
     39     return exception

~/path/to/project/logger.py in exception(msg, exc_info, *args, **kwargs)
     32             msg = Exception(msg)
     33         try:
---> 34             raise msg
     35         except Exception as ex:
     36             str_exception(msg, *args, exc_info=exc_info, **kwargs)

ValueError: This is an exception
``` 

Which, I think, has achieved what I wanted. 

It is worth taking a moment to discuss that this pattern isn't *really* how exceptions are intended to be used. In most scenarios, exceptions should be handled and logged when they occur by the code that actually caused them. Instead, here I am letting the logger being 'proactive' in logging exceptions. This pattern definitely is strange (especially if in the parent code the exception is gracefully handled, although that would be challenging in my library with missing data modalities) but I've found this eager exception handling to be incredibly helpful for debugging several things in this library that I'm working on.  

And `logger.py` in full is now given as: 

```python
# Adapted from:
#   https://gist.github.com/nguyenkims/e92df0f8bd49973f0c94bddf36ed7fd0

import logging
import sys
from logging import FileHandler

FORMATTER = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
LOG_FILE = "logging.log"


def get_console_handler():
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(FORMATTER)
    return console_handler


def get_file_handler():
    file_handler = FileHandler(LOG_FILE, mode="w")
    file_handler.setFormatter(FORMATTER)
    return file_handler


def logger_exception(logger):
    str_exception = logger.exception
    
    def exception(msg, *args, exc_info=True, **kwargs):
        if isinstance(msg, Exception):
            try:
                raise msg
            except Exception as ex:
                str_exception(msg, *args, exc_info=exc_info, **kwargs)
                raise ex
            
        logger.warn(
            f'logger.exception was called outside of exception scope.'
        )
        str_exception(msg, *args, exc_info=exc_info, **kwargs)
    
    return exception


def get_logger(logger_name, with_file=True, with_console=True, raise_exceptions=True):
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.DEBUG)
    if with_console:
        logger.addHandler(get_console_handler())
    if with_file:
        logger.addHandler(get_file_handler())
    logger.propagate = False
    
    if raise_exceptions:
        logger.exception = logger_exception(logger)
    
    return logger
```

