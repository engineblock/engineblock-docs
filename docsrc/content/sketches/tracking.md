---
date: 2017-05-19T22:09:53
title: Cycle Tracking
weight: 13
#menu:
#  main:
#    parent: Design Sketches
#    identifier: Cycle Tracking
#    weight: 12
---

{{< note >}}
See also: [Tracking, Visually](../tracking_visually/)
{{< /note >}}

## Synopsis

When coordinating activities with each other, it is necessary to link the
completion status of an activity to the inputs available to another. Doing this
concurrently and efficiently presents some interesting challenges.

Some testing scenarios require that you are able to take the results of
one phase of testing as input to another phase. For example, you may want
to simply visit created data in a later phase to verify that it is accurate.

Engineblock already encapsulates a unit of testing with the *activity* concept.
Activities also have well-defined input semantics. However, there is not yet a
facility to allow an activity to feed another one with a set of inputs that
match some criteria selected by the tester. There isn't even yet a facility for
an activity to capture results as an information source for others.

In this section, hypothetical activities A and B will be coordinating their
execution on individual cycles. A schematic of the dataflow between activity A
and B follows:

{{< viz >}}
digraph sys1 {
 rankdir=LR;
 node[shape=box]
 edge[dir=out]
 state[label="Internal state"];
 
 A -> marker;
 marker -> state;
 state -> tracker;
 tracker -> B;
}
{{< /viz >}}

The logic for producing inter-activity data and consuming it is mostly decoupled
from activity internals for a couple of reasons that will become clearer below.

## Definitions

### Serializing Cycles

A simple form of interplay between two activities is to allow a downstream
activity to take action on cycles that have been fully retired or completed by
an upstream activity. When serializing cycles values between an activity A and
an activity B, you are ensuring that active processing of that iteration does
not overlap in time between them. It simply means that the input to B blocks
until it has enough completion data to know that that activity A has retired the
cycle.

### Consuming Results

If you want to provide some detail to activity B for the specific cycle
iterations run by A, then each cycle of A needs to yield a result. This means
that Activities in general need to to act as a function between the cycle number
and some result type. It is not sufficient to simply know when a cycle is no
longer active in A. Now, you have data that needs to be pipelined between activities
A and B. Typical queueing methods can create higher contention than is desired here,
so other type-specific strategies will be used.

- A *CycleResultSink* is the data consumer side of result data provided by an activity.
- A *CycleResultSource* is the data producer side of result data provided by an activity.
- The combination of these two functions is called a *CycleTracker*.

### Result Coding

The semantics and representation of specific result types vary across
activity types. That makes it a non-trivial problem to allow various types of
activities to communicate about results in their own idiomatic way.

Instead, we will choose a simple and common data format that can be optimized
and built upon. Because of the affinity between ints and the Enum type, 
a cycle result of int is suitable. Further, because of the trade-offs between
space and information density, a single byte is a suitable maximum size for
storage. We can ask an individual cycle to return an int to represent its 
result, with some limitations about the values it may take.

There are some trade-offs in this approach. One is that a user may have to map
the semantics of specific values to things like "pass", or "fail", or something
entirely different. However, the ability to do this is also a degree of
flexibility. It should be possible to create flows between activities with
different semantic languages simply by providing a suitable result code for
interesting cycle outcomes.
 
For the reasons above, activities will be required to provide a single integer
value, but the allowable values provided will be limited to zero and positive
values between 1 and 127, inclusive. The reasons for this will become clearer as
we go forward.

### Filtering

A *CycleFilter* is simply an IntPredicate wrapper. It is used to filter cycle
results. The thread harness (The Motor, in EngineBlock parlance) uses cycle
filters when provided in order to subfilter the available cycles that will be
dispatched to an action.

## The Tracking Bestiary

There are various functional design trade-offs to think about when building an
efficient coordination layer between different thread pools. Practically
speaking, that is what we are attempting to do. However, the trade-offs are
center stage, given the heterogeneous nature of activity types as well as the
performance mandate. This section is meant to describe the various functional
gamuts in one place, in order to clarify the choices ultimately made in
different implementations.

### blocking or non-blocking

A Tracker is non-blocking if it is able to scale well for many sources and
sinks. It is not, for example, if it has internal synchronization that could
make it a critical bottleneck. Given that this EngineBlock is meant to be a test
instrument, you should not build trackers that do this unless they are
purchasing something very useful for the trade-off.

### throttling or non-throttling

Slightly different than blocking is the notion of throtting. In terms of functional
needs, a tracker may have good reason to throttle either the source or the sink
side of data flow. 

### blocking vs throttling

The primary distinction between blocking and throttling is whether or not the
behavior is needed to support a particular scenario or configuration.

Consider a case in which activity A runs 54,000,000,000 cycles, each after which
activity B is intended to repeat a different action on the same numbered cycles.
If activity A ran on average twice a fast as activity B, then there is an
implied buffer of 27,000,000,000 cycles that would be waiting for B to catch up
once A is finished. If this were a performance test, then the cost of holding
that queue would surely impact the results and very likely the ability of the
test system to run well. In this case it would make sense to tie the execution
rate of activity B to activity A, at least within some reasonable bound. That
would mean that A would have to wait on B about half the time, however the flow
between the two activities would still be meaningful and executable. This is an
example of throttling that makes sense.

Alternatively, consider what would happen if you were to cause activity A to
wait often while sinking a result. Even if activity B was not sourcing data from
that tracker, it would be considered a serious blocking effect that would limit
the fidelity of any test results.

### Thread-safety: all markers and trackers

All trackers must be thread safe. Any practical scenario has activities with
many threads.

### persisted or non-persisted

A tracker may record its data stream (a sequence of cycle values and result
codes) in a form to be later re-used. These may be provided in the future with
CycleRecorder* and *CyclePlayer* types.

### buffered or non-buffered

The interaction between the producer-consumer pairing of a sink and source may
be buffered, meaning that the tracker may not always see the last logical value
recorded by the upstream activity, or that the it may not imediatly expose the
absolute latest value to any downstream activity.

## Open questions

Buffering is necessary in order to reduce contention between markers and
trackers acting on the same internal data. You can have a buffering range of,
say 1K cycles, and still maintain high throughput between the producer and the
consumer thread pools. However, if you required that the tracker always see
the immediate state of the marker, it becomes more difficult to build an optimal
marker, and vice versa.

Still, when a marker has stopped providing new data, it may be necessary to
allow a marker or tracker implementation to fall back to a finer-grained
high-precision mode in order to avoid blocking a scenario completion. The catch
is that you don't always know how many cycles will actually be attempted, and
thus how many you should absolutely be expecting a cycle result for. If you are
blocking a reader (tracker) while you await a marker segment to be completed,
and that marker segment will never complete because the marking activity is
stopped, then you have a deadlock.

One potential solution to this is to require marker users (senders) to have a
logicall connected and disconnected state, and to allow marker implementations
to use these as active management events for the purposes of adjusting blocking
modes according to efficiency and timeliness requirements.

{{< viz >}}
digraph d {
 node[shape="box"];
a[shape="record",label="0|1|2|3|4|5|6|7|8|9|10|11|..."];
    
}
{{< /viz >}}