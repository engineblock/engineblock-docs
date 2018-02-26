---
date: 2017-05-19T21:52:57
title: Activity Params
weight: 12
menu:
  main:
    parent: Parameters
    identifier: activity-params
    weight: 26
---

Activity parameters are passed as named arguments for an activity, either on the
command line or via a scenario script. On the command line, these take the form
of

    <paramname>=<paramvalue>

Some activity parameters are universal in that they can be used with any
activity type. These parameters are recognized by EngineBlock whether or not
they are recognized by a particular activity type implementation. These are
called _universal activity parameters_. Only universal activity parameters are
documented here.

## type

- format `type=<activity type>`

You *must* set the _type_ parameter for every activity so that EngineBlock
knows which activity implementation to use.

This tells EngineBlock which activity type will be run for the provided
parameters. This is used, for example, with the `run` or `start` commands. An
activity of the named type will be initialized, and then further activity
parameters on the command line will be used to configure it before it is
started.

The available activity types can be discovered with the `--list-activity-types`
global option.
        
## alias

`alias=<alias>`

You *should* set the _alias_ parameter when you have multiple activities,
when you want to name metrics per-activity, or when you want to control
activities via scripting.

Each activity can be given a symbolic name known as an _alias_. It is good
practice to give all your activities an alias, since this determines the named
used in logging, metrics, and even scripting control.

_default value_ : If the activity supports YAML config, then any provided YAML
filename is used as the basis for the default alias. Otherwise, the activity
type name is used. This is a convenience for simple test scenarios only.

## threads

`threads=<threads>`

You *should* set the _threads_ parameter when you need to ramp up a workload.

Each activity can be created with a number of threads. It is important to adjust
this setting to the system types used by EngineBlock.

_default value_ : For now, the default is simply *1*. Users must be aware of
 this setting and adjust it to a reasonable value for their workloads. 

## cycles

`cycles=<cycle count>`

`cycles=<cycle min>..<cycle max>`

You *should* set the cycles for every activity. Not setting it means that only
one or a few cycles will run, constituting a sanity check at best.

The cycles parameter determines the starting and ending point for an activity.
In the `cycles=<cycle count>` version, the count indicates the total number of
cycles, and is equivalent to `cycles=0..<cycle max>`. In both cases, the max
value is not the actual number of the last cycle. This is because all cycle
parameters define a closed-open interval. In other words, the minimum value is
either zero by default or the specified minimum value, but the maximum value is
the first value *not* included in the interval. This means that you can easily
stack intervals over subsequent runs while knowing that you will cover all
logical cycles without gaps or duplicates. For example, given `cycles=1000` and
then `cycles=1000..2000`, and then `cycles=2000..5K`, you know that all cycles
between 0 (inclusive) and 5000 (exclusive) have been specified.

## seq

`seq=<bucket|concat|interval>`

This activity parameter set the default sequencing scheme for ratios. When
ratios are used in a YAML config, a sequencer planner uses the assigned ratios
to create a sequence of operations. Presently, *seq* is only an activity
parameter, as it is not yet possible to have more than one type of sequencer
over the statements in a single activity.

There are currently three different kinds of sequence planners:

 - bucket - This is a round robin planner which draws operations from buckets in
 circular fashion, removing each bucket as it is exhausted. For example, the
 ratios A:4, B:2, C:1 would yield the sequence A B C A B A A. The ratios A:1, B5
 would yield the sequence A B B B B B.
 
 - concat - This simply takes each statement as it occurs in order and duplicates
 it in place to achieve the ratio. The ratios above (A:4, B:2, C:1) would yield
 the sequence A A A A B B C for the concat sequencer.
 
 - interval - This is arguably the most complex sequencer. It takes each ratio
 as a frequency over a unit interval of time, and apportions the associated
 operation to occur evenly over that time. When two operations would be assigned
 the same time, then the order of appearance establishes precedence. In other
 words, statements appearing first win ties for the same time slot. The ratios
 A:4 B:2 C:1 would yield the sequence A B C A A B A. This occurs because, over
 the unit interval (0.0,1.0), A is assigned the positions [0.0, 0.25, 0.5,
 0.75], B is assigned the positions [0.0, 0.5], and C is assigned position
 [0.0]. These offsets are all sorted with a position-stable sort, and then the
 associated ops are taken as the order. In detail, the rendering appears thus:
 [0.0(A), 0.0(B), 0.0(C), 0.25(A), 0.5(A), 0.5(B), 0.75(A)] which yields A B C A
 A B A. This sequencer is most useful when you want a stable ordering of
 operations from a rich mix of statement types, where each operations is spaced
 as evenly as possible over time, and where it is not important to control the
 cycle-by-cycle sequencing of statements.

{{< warning >}}
Parameters which are documented below are for advanced testing scenarios.
If you are a first-time EngineBlock user, it is recommended that you
get familiar with the parameters above first. These parameters can unlock
some of the advanced testing capabilities of EngineBlock, although they are
not necessary for general performance testing.
{{</ warning >}}

## input

`input=type:<input type>[,...]`

You *may* use input instead of [cycles](#cycles) when needed for advanced test
scenarios.

Every activity requires a set of cycle numbers on which to operate. The default
interval-based input simply provides a set of cycles from a closed-open interval.
Sometimes you need to control the cycles in a more specific way, say, for testing
exceptional cases from a previous run.

The input activity parameter allows for reflection-based configuration of the
input data source for an activity. The sub-parameters for _input_ are dependent
on the specific input implementation. To see those, use `--list-input-types`.

Example: `input=type:cyclelog,file=lastrun`

The cycles parameter acts as shorthand for configuring a basic interval-based
input when no other input type is specified. It is essential equivalent to
`input=type:core,cycles=<cycles>`.


## inputfilter

`inputfilter=include:54,exclude:32-35,...`

`if=include:54,exclude:32-35,...`

You *may* use _inputfilter_ when _input_ has also been specified.

Some input types allow for filtering of the values on input according to a filter.

## output

`output=type:<output type>[,...]`

You *may* use _output_ in order to capture the per-cycle results of a test to
a buffer or file.

EngineBlock activities can yield a result status ordinal that is a simple integer
value. This can be useful, for example, to record the status of individual cycles
according to a result mapping for that activity. By default, the output values
are discarded. With the _output_ parameter, you can specify a reflection-based
output handler that will do something specific with the output values. To see
the supported output types, use `--list-output-types`.

Example: `output=type:cyclelog,file=testcycles`

## outputfilter

`outputfilter=...`

`of=...`

You *may* use _outputfilter_ if _output_ has also been specified.

If an output is used, then an output filter can be provided that will filter
results before any further downstream handling, like writing to a logfile, for example.
Presently, the output






