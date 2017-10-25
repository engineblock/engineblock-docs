---
date: 2017-10-24T00:00:00
title: Config File Format
weight: 12
menu:
  main:
    parent: User Guide
    identifier: configfiles
    weight: 22
---

In the EB 2.* and newer versions, a uniform YAML configuration format is
provided that makes it easy to use for any activity that requires
statements, tags, parameters and data bindings. That format is described here.

There are two parts to this documentation. The first part is a description of
the document format itself, with some notes on semantics and usage. The second
part is a guide for programmers for using the API to load the format. That part will
be in the dev guide.

## Format

A valid config file for an activity consists of

1. One or more documents, separated by '---', each containing:
   0. an optional document name, under a *name* field.
   1. zero or more tags, under a *tags* section, in key-value format
   2. optional parameters, under a *params* section, in key-value format
   3. optional data bindings, under a *bindings* section, in key-value format.
   4. optional statements, under a *statements* section, list format.
   5. zero or more blocks, under a *blocks* section, in block list format, each having:
     0. an optional block name, under a *name* field.
     1. zero or more tags, under a *tags* section, in key-value format
     2. optional parameters, under a *params* section, in key-value format
     3. optional data bindings, under a *bindings* section, in key-value format.
     4. optional statements, under a *statements* section, list format.

This is essentially a nested template format. An example:

    name: simple-csv-example
    statements:
     - {alpha},{beta},{gamma}
    bindings:
     alpha: Identity()
     beta: NumberNameToString()
     gamma Combinations('0-9A-F;0-9;A-Z;_pro;')

This is just a simple example. Sometimes this is all you need. The uniform
configuration format is designed to scale up and down in complexity depending
on whether you need a sophisticated configuration or something very simple like
the above.

No matter what, the whole YAML format is about configuring statements or other
operations to be used in an activity. The statement syntax that you will use
will depend on the ActivityType that you are using it with. This generalization
applies as well to tags, params, and bindings. In general, testing requires
statements, statement parameters, and data bindings. We add to these the
concepts of blocks and tags.

## Blocks

As stated above, the real purpose of this format is to make it easy to configure
statements. That means that the tags, params, and bindings are all really
statement properties, yet statements are provided in list form. How do we map
the params, tags, and bindings to them? The simple rule is that any tag,
binding, or param that is defined at the same level as the statement applies
directly to it. If there are 40 statements in a block, and 3 params in that
block, then those 3 params will be associated directly with each of those 40
statements.

However, this is not the full story. Statements occur in list form, with no
internal structure for an individual set of tag, param, or binding data. If you
need to have this type of control for a given statement, where other statements
do not share its configuration, then use blocks. Any tags, params, or bindings
that are defined at the block level will apply to all statements in that block.

Any tags, params, or bindings that are defined at the document level will,
also apply to all statements within that document, unless there is one of the
same name already assigned within a given statement's block.

## Detailed Examples

Here is a more thorough example with some blocks:

    name: mixed-csv-example
    params:
     ratio: 1
    blocks:
     - name: low-ratio
       statements:
        - test1-{alpha},{beta},{gamma}
        - test2-{alpha},{gamma},{beta}
       bindings:
        alpha: Combinations('b;l;o;c;k;1;-;COMBINATIONS;');
     - name: high-ratio
       params:
        ratio: 9
       statements:
        - test3-{beta},{alpha},{gamma}
        - test4-{beta},{gamma},{alpha}
       bindings:
        alpha: Combinations('b;l;o;c;k;2;-;COMBINATIONS;');
    bindings:
     beta: NumberNameToString()
     gamma Combinations('0-9A-F;0-9;A-Z;_pro;')

This example allows us to show the practical value of blocks.
Blocks are both a grouping mechanism as well as an inheritance mechanism.

In this case, we see four statements, notated as test1, test2, test3, and test4.

We also see that the block with name 'low-ratio' has no ratio param assigned.
As such, it will take the defaults from the document, "1" in this case.
Being a "statement configuration" format, this means that the statements
test1 and test2 *have* ratio: 1. In contrast, the block named 'high-ratio' has
its own set of params. The ratio param overrides the doc value in this case, so
test3 and test4 *have* ratio: 9. This exact logic applies to the other types
of configuration elements.

## Tags

Tags are used to mark and filter groups of statements for controlling different
types of scenario execution. As such, they extend the command line syntax with
the ability to match statements that have certain tag properties:

1. A given tag name is defined
2. A given tag name is defined and its value is something specific
3. A given tag name is defined and its value matches a pattern

### Tag Filtering

A simple tag filtering form is used across all tags. Examples of the above, respectively,
are:

    tags=keyname1

    tags=keyname2:value2

    tags='keyname3:.*matchme'

Each of these examples only shows one of the tag matching forms. It is possible to combine
these into compound tag filters. In this case, they are conjugated with an implied *and*.
For example, "tags='keyname1,keyname3:.*matchme'" will only match statements that have a tag
named keyname1 and a tag named keyname3 with a value that ends with 'matchme'.

## Params

Configuration Params are simple string-string maps of configuration parameters that are
contextual to the activity type. An example would be whether a statement should be prepared
or not. It is up to the ActivityType designer to document the params for each driver type.

## Bindings

Data Bindings are the standard way of assigning a procedural data generation recipe to
be used with statements (operations) within an activity.

Bindings can safely be set at the doc level or the block level for re-use by
statements. Statements within a given activity type should only call the
bindings for data generation when each binding is used by name. Because of this,
it is generally safe to define as superset of binding recipes at the doc level
with each statement pulling in values as needed. Consider the bindings as a menu
of data streams, with each statement pulling data from those streams only where
specified by named anchors.