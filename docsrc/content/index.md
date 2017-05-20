---
date: 2017-05-19T21:52:39
title: EngineBlock Users Guide
type: index
weight: 0
---

[![Latest Release](https://maven-badges.herokuapp.com/maven-central/io.engineblock/eb-api/badge.svg)](https://maven-badges.herokuapp.com/maven-central/io.engineblock/engineblock/) [![Build Status](https://travis-ci.org/engineblock/engineblock.svg?branch=master)](https://travis-ci.org/engineblock/engineblock)

### Status
This is in active development. Collaborators are welcome. However, there is still work to be done to groom the slope for new users.

## Engine Block

This project aims to provide a missing power tool in the test tooling arsenal.

The design goals:

1. Provide a useful and intuitive Reusable Machine Pattern for constructing and reasoning about concurrent performance tests. To encourage this, the runtime machinery is based on [simple and tangible core concepts](https://github.com/engineblock/engineblock/blob/master/docs/core_concepts.md).
2. Reduce testing time of complex scenarios with many variables. This is achieved by controlling tests from an [open javascript sandbox](https://github.com/engineblock/engineblock/blob/master/docs/scripting.md). This makes more sophisticated scenarios possible when needed.
3. Minimize the amount of effort required to get empirical results from a test cycle. For this, [metrics reporting](https://github.com/engineblock/engineblock/blob/master/docs/metrics.md) is baked in.

In short, Engine Block wishes to be a programmable power tool for performance testing. However, it is somewhat generic. It doesn't know directly about a particular type of system, or protocol.
It simply provides a suitable machine harness in which to put your drivers and testing logic. If you know how to build a client for a particular kind of system, EB will let you load it like a plugin and control it dynamically.

The most direct way to do this, if you are a tool developer, is to build your own activity type drivers and embed EB as the core runtime. You can always experiment with it and learn how it works by using the built-in diagnostic drivers.

## Getting Started

You can begin at [Quick Start](https://github.com/engineblock/engineblock/blob/master/docs/quickstart.md) or consult the full [Usage Guide](https://github.com/engineblock/engineblock/blob/master/docs/usage_guide.md). At least taking a glance at the guide is recommended.

## Contributions
If you are interested in contributing to Engine Block, more information is available in the [Developer's section](https://github.com/engineblock/engineblock/blob/master/docs/developers.md).

## History

The Engine Block project started as a branch of [test client](http://github.com/jshook/testclient). It has since evolved to be more generic.

## License
This is licensed under the Apache Public License 2.0





