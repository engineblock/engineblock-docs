---
date: 2017-05-19T22:09:53
title: Tracking Concepts
#menu:
#  main:
#    parent: Design Sketches
#    identifier: Tracking Diagrams
#    weight: 12
---

This section is meant to clarify some of the concepts used within engineblock
for marking results of one activity and tracking them for use by other
activities.

# Activities and Cycles

As before, all activities running within an engineblock scenario iterate
on cycles. Whereas before, each activity would operate exclusively on
a contiguous interval of cycles, now activities can operate on a set of
cycles which are not contiguous. Still, the cycles must be in order.

This means that the hand-off of cycle values from the core thread harness (aka
'motor') to the individual action thread must now include individual cycle data
rather than simple interval bounds.

# Cycle Results

## Cycle Result Format

The result produced by a given cycle is called the *cycle result*. It can be any
value between 0 and 127, inclusive. Why the limit? There is a trade-off between
flexibility and efficiency. It is unlikely that you would want more than even a
dozen different outcomes to be handled within a specific test. If this type is
too narrow, it can be widened in a future release.

## Cycle Result Semantics

Each activity type has its own way to interpret cycle results by default.
Further each activity instance may have a local mapping that determines what
different result values mean. For example, activity type A may assert that cycle
results with value 3 *always* mean "timed out connecting to transport", while
activity type B may provide the ability to map the internal result details to a
scenario-specific result table.

In essence, Each activity type will be responsible for determining what a result
value means, and in some cases, the individual parameters of activity instances
may provide more filtering.

# Result Marking

Result marking is the act of recording the result value and the cycle that
produced it. Implementations that do this are termed *markers*. Different marker
implementations trade-off performance, data size, etc.

When an activity is configured with a marker, every cycle that is completed is
recorded before the next available cycle is dispatched to an action.

All result marker implementations are based around the internal cycle result
consumer API, known as *CycleResultSink*. When a result marker implementation
records a result, takes the common API form and stores it in an internal form.

## Marking contiguous cycle ranges

Result markers are required to coalesce their results into contiguous chunks of
data. This serves multiple purposes, including micro-batching the marker updates
into discrete chunks of consumable state. As such, near-time processes such as
other activities may consume marker data as a near-time data stream.

The core marker logic works this way:

1. Organize marker data (cycles and results) into linked buffering extents.
2. Accept updates within a window, assigning them to the correct extent.
3. Once the first extent is complete, publish it to any downstream consumers.

If an update is presented for a cycle higher than that in the allowed buffering
extents, then the tracker must block the producer until the window is open for
that cycle number, and unblock when the appropriate extent is ready. Updates for
already-published extents are not allowed and cause an exception to be thrown.

## Marking non-contiguous cycle ranges

Presently, marker implementations do not support marking non-contiguous cycle
ranges. This is expected to added in the future with a slight API change.

## Result Data and Marking State

Marking implementations may keep internal stream head or other data structure
management state as required to support the lifetime of the producing activity.
This is separate from the marking semantics of (cycle, result) and should not be
persisted with that data.

# Result Tracking

Result tracking is the act of providing timely updates from marked result state to
a cycle result consumer.

Internally, all tracker implementations are based around the internal cycle
result producer API, known as *CycleResultSource*. When a result tracker implementation
provides a result, it reads an internal form and converts it to the common API form.

## Result tracking state

Multiple concurrent trackers should be able to consume the
same marker data with no logical conflicts.

# Marking and Tracking implementations

Because both markers and trackers act as near-time SERDES for an internal form, they
are often found in pairs. Consider this example of an in-memory implementation:

{{< viz >}}
digraph ring {
 rankdir=LR;
 node[shape=box]
 edge[dir=out]
 state[label="ring buffer\nin memory",shape="ellipse"];
 A[label="Activity\nA"];
 B[label="Activity\nB"];
 marker[label="mem\nmarker"]
 tracker[label="mem\ntracker"]

 A -> marker;
 marker -> state;
 state -> tracker;
 tracker -> B;
}
{{< /viz >}}


## Core Marker Tracker

The following diagram provides a basic schematic of how the core marker tracker
works. An atomically managed linked list of extents is kept for both the marking
and tracking services. When the head of the marker extents chain is undefined,
then the marker caller must block and wait for tracking to catch up and prepare
the next extent. Likewise, when the head of the tracking extents chain is
undefined, then the tracker caller must block and wait for the marker callers to
catch up.


{{< viz >}}
digraph extents {
    rankdir=LR;
    node[shape=box]
    size="8";
    E3[shape="record",label="E3|{[13,20)}|{<0>0|<1>1|<2>2|<3>3|<4>4|<5>5|<6>6|<7>7}"]
    E4[shape="record",label="E4|{[20,27)}|{<0>0|<1>1|<2>2|<3>3|<4>4|<5>5|<6>6|<7>7}"]
    E5[shape="record",label="E5|{[27,34)}|{<0>0|<1>1|<2>2|<3>3|<4>4|<5>5|<6>6|<7>7}"]
    undefined[label="undefined"]

    E3 -> E4 -> E5 [label="next"]
    marker -> E4 [label="head marking\nextent"]
    marker -> undefined [style="dotted",fillcolor="none"]

    tracker -> E3 [label="head tracking\nextent"]
    tracker -> undefined [style="dotted",fillcolor="none"]
}
{{< /viz >}}

There are important invariants that must be maintained outside of critical sections
in order to avoid concurrent deadlocks.

1. At all times, either a marker or a tracker must be defined. This is seeded by
   the initializer logic, which prepares the max extents number of extents before
   marking commences.
2. The tracker head extent will either be the oldest/lowest numbered extent or it will be null.
3. The marker head extent will be
2. Marking logic does not prepare new marking extents. Only trackers do that.
3. Tracking logic does not see partially completed extents.
4. By extension, the head of the marking and tracking chain can never be the same,
   and if both are defined, the head marker extent must be ahead of the head tracker extent.




## Examples

### initial state

{{< viz >}}
digraph extents {
    rankdir=LR;
    node[shape=box]
    size="4";

    E3 -> E4 -> E5

    marker -> E3
    tracker -> undefined
}
{{< /viz >}}

### extent filled

{{< viz >}}
digraph extents {
    rankdir=LR;
    node[shape=box]
    size="4";

    E3[style="bold"]
    E3 -> E4 -> E5

    marker -> E4
    tracker -> E3
}
{{< /viz >}}

### marker outruns tracker

{{< viz >}}
digraph extents {
    rankdir=LR;
    node[shape=box]
    size="4";

    E3[style="bold"]
    E4[style="bold"]
    E5[style="bold"]
    E3 -> E4 -> E5

    marker -> undefined
    tracker -> E3
}
{{< /viz >}}

### tracker outruns marker

{{< viz >}}
digraph extents {
    rankdir=LR;
    node[shape=box]
    size="4";

    E3 -> E4 -> E5

    marker -> E3
    tracker -> undefined
}
{{< /viz >}}


