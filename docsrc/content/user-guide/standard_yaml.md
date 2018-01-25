---
date: 2017-10-24T00:00:00
title: YAML Config
weight: 12
menu:
  main:
    parent: User Guide
    identifier: configfiles
    weight: 22
---

In the EngineBlock 2.* and newer versions, a standard YAML configuration format is
provided that makes it easy to use for any activity that requires statements,
tags, parameters and data bindings. In practice, any useful activity types have
needed these. This section describes the standard YAML format and how to use it.

A valid config file for an activity consists of statements, parameters for those
statements, bindings for the data to use with those statements, and tags for
selecting statements for an activity. In essence, the config format is *all about
configuring statements*. Every other element in the config format is in some way
modifying or otherwise helping create statements to be used in an activity.

## Statements

Statements are the single most important part of a YAML config:

```yaml
# a single statement
statement: a single statement body
```

This is a valid YAML in and of itself. It may not be valid for a particular
activity type, but that is up to each activity type to decide. That is because
the contents of the YAML will matter to each activity type in a different way.
Thus, each activity type determines what a statement means, and how it will be
used. The format is merely concerned with structure and very general semantics.

In the example above, the statement is automatically named according to its
location within the YAML document.

## Bindings

Procedural data generation is now built-in to the EngineBlock runtime by way of
the [Virtual DataSet](http://virtdata.io/) library. Thus, bindings are now
supported as a core concept. You can add a bindings section like this:

```yaml
bindings:
 alpha: Identity()
 beta: NumberNameToString()
 gamma: Combinations('0-9A-F;0-9;A-Z;_;p;r;o;')
 delta: WeightedStrings(one:1;six:6;three:3;)
```

Notice that bindings are represented as a map. The bindings above *mostly* match
up with the named anchors in the statement list above. There is one extra
binding, but this is ok. However, if the statement included named anchors for which no
binding was defined, an error would occur.

{{< note >}}
This is important for activity type designers to observe: When statement bindings
are paired with statements, a binding should not be used directly unless it is
paired with a matching anchor name in the statement. This allows activity and
scenario designers to keep a library of data binding recipes in their
configurations without incurring the cost of extraneous binding evaluations.
{{</note >}}

Still, the above statement block is a valid config file. It may or may not be
valid for a given activity type. The 'stdout' activity will synthesize a
statement template from the provided bindings if needed, so this is valid:

```text
[test]$ cat > stdout-test.yaml
    bindings:
     alpha: Identity()
     beta: NumberNameToString()
     gamma: Combinations('0-9A-F;0-9;A-Z;_;p;r;o;')
     delta: WeightedStrings(one:1;six:6;three:3;)
# EOF (control-D in your terminal)

[test]$ ./eb run type=stdout yaml=stdout-test cycles=10
0,zero,00A_pro,six
1,one,00B_pro,six
2,two,00C_pro,three
3,three,00D_pro,three
4,four,00E_pro,six
5,five,00F_pro,six
6,six,00G_pro,six
7,seven,00H_pro,six
8,eight,00I_pro,six
9,nine,00J_pro,six
```

If you combine the statement section and the bindings sections above into one
activity yaml, you get a slightly different result, as the bindings apply
to the statements that are provided:

```text
[test]$ cat > stdout-test.yaml
statements:
 - |
  This is a statement, and the file format doesn't
  know how statements will be used!
 - |
  submit job {alpha} on queue {beta} with options {gamma};
bindings:
 alpha: Identity()
 beta: NumberNameToString()
 gamma: Combinations('0-9A-F;0-9;A-Z;_;p;r;o;')
 delta: WeightedStrings(one:1;six:6;three:3;)
# EOF (control-D in your terminal)

[test]$ ./eb run type=stdout yaml=stdout-test cycles=10
This is a statement, and the file format doesn't
know how statements will be used!
submit job 1 on queue one with options 00B_pro;
This is a statement, and the file format doesn't
know how statements will be used!
submit job 3 on queue three with options 00D_pro;
This is a statement, and the file format doesn't
know how statements will be used!
submit job 5 on queue five with options 00F_pro;
This is a statement, and the file format doesn't
know how statements will be used!
submit job 7 on queue seven with options 00H_pro;
This is a statement, and the file format doesn't
know how statements will be used!
submit job 9 on queue nine with options 00J_pro;
```

There are a few things to notice here. First, the statements that are executed
are automatically alternated between. If you had 10 different statements listed,
they would all get their turn with 10 cycles. Since there were two, each was run
5 times.

Also, the statement that had named anchors acted as a template, whereas the
other one was evaluated just as it was. In fact, they were both treated as
templates, but one of the had no anchors.

On more minor but important detail is that the fourth binding *delta* was not
referenced directly in the statements. Since the statements did not pair up an
anchor with this binding name, it was not used. No values were generated for it.
This is how activities are expected to work when they are implemented correctly.
This means that the bindings themselves are templates for data generation, only
to be used when necessary.

## Params

As with the bindings, a params section can be added at the same level, setting
additional parameters to be used with statements. Again, this is an example of
modifying or otherwise creating a specific type of statement, but always in a
way specific to the activity type. Params can be thought of as statement
properties. As such, params don't really do much on their own, although they
have the same basic map syntax as bindings:

```yaml
params:
 ratio: 1
```

As with statements, it is up to each activity type to interpret params in a
useful way.

## Tags

Tags are used to mark and filter groups of statements for controlling which ones
get used in a given scenario:

```yaml
tags:
 name:foxtrot
 unit: bravo
```

### Tag Filtering

The tag filters provide a flexible set of conventions for filtering tagged statements.
Tag filters are usually provided as an activity parameter when an activity is launched.
The rules for tag filtering are:

1. If no tag filter is specified, then the statement matches.
2. A tag name predicate like <code>tags=name</code> asserts the presence of a specific
   tag name, regardless of its value.
3. A tag value predicate like <code>tags=name:foxtrot</code> asserts the presence of
   a specific tag name and a specific value for it.
4. A tag pattern predicate like <code>tags=name:'fox.*'</code> asserts the presence of a
   specific tag name and a value that matches the provided regular expression.
5. Tag predicates are joined by *and* when more than one is provided -- If any predicate
   fails to match a tagged element, then the whole tag filtering expression fails
   to match.

A demonstration...

```text
[test]$ cat > stdout-test.yaml
tags:
 name: foxtrot
 unit: bravo
statements:
 - "I'm alive!\n"
# EOF (control-D in your terminal)

# no tag filter matches any
[test]$ ./eb run type=stdout yaml=stdout-test
I'm alive!

# tag name assertion matches
[test]$ ./eb run type=stdout yaml=stdout-test tags=name
I'm alive!

# tag name assertion does not match
[test]$ ./eb run type=stdout yaml=stdout-test tags=name2
02:25:28.158 [scenarios:001] ERROR i.e.activities.stdout.StdoutActivity - Unable to create a stdout statement if you have no active statements or bindings configured.

# tag value assertion does not match
[test]$ ./eb run type=stdout yaml=stdout-test tags=name:bravo
02:25:42.584 [scenarios:001] ERROR i.e.activities.stdout.StdoutActivity - Unable to create a stdout statement if you have no active statements or bindings configured.

#tag value assertion matches
[test]$ ./eb run type=stdout yaml=stdout-test tags=name:foxtrot
I'm alive!

# tag pattern assertion matches
[test]$ ./eb run type=stdout yaml=stdout-test tags=name:'fox.*'
I'm alive!

#tag pattern assertion does not match
[test]$ ./eb run type=stdout yaml=stdout-test tags=name:'tango.*'
02:26:05.149 [scenarios:001] ERROR i.e.activities.stdout.StdoutActivity - Unable to create a stdout statement if you have no active statements or bindings configured.
```

## Blocks

All the basic primitives described above (names, statements, bindings, params,
tags) can be used to describe and parameterize a set of statements in a yaml
document. In some scenarios, however, you may need to structure your statements
in a more sophisticated way. You might want to do this if you have a set of
common statement forms or parameters that need to apply to many statements, or
perhaps if you have several *different* groups of statements that need to be
configured independently.

This is where blocks become useful:

```text
[test]$ cat > stdout-test.yaml
bindings:
 alpha: Identity()
 beta: Combinations('u;n;u;s;e;d;')
blocks:
 - statements:
   - "{alpha},{beta}\n"
   bindings:
    beta: Combinations('b;l;o;c;k;1;-;COMBINATIONS;')
 - statements:
   - "{alpha},{beta}\n"
   bindings:
    beta: Combinations('b;l;o;c;k;2;-;COMBINATIONS;')
# EOF (control-D in your terminal)

[test]$ ./eb run type=stdout yaml=stdout-test cycles=10
0,block1-C
1,block2-O
2,block1-M
3,block2-B
4,block1-I
5,block2-N
6,block1-A
7,block2-T
8,block1-I
9,block2-O
```

This shows a couple of important features of blocks. All blocks inherit defaults
for bindings, params, and tags from the root document level. Any of these values
that are defined at the base document level apply to all blocks contained in
that document, unless specifically overridden within a given block.

## More Statements

### Statement Sequences

To provide a degree of flexibility to the user for statement definitions,
multiple statements may be provided together as a sequence.

```yaml
# a list of statements
statements:
 - "This a statement."
 - "The file format doesn't know how statements will be used."
 - "submit job {job} on queue {queue} with options {options};"

# an ordered map of statements by name
statements:
 name1: statement one
 name2: "statement two"
```

In the first sequence form, automatic statement naming occurs. In the last form,
each statement has a name provided as a key. The only difference between these
two forms is that the names are provided automatically in the first.

### Statement Delimiting

Sometimes, you want to specify the text of a statement in different ways. Since
statements are strings, the simplest way for small statements is in double
quotes. If you need to express a much longer statement with special characters
an newlines, then you can use YAML's literal block notation (signaled by the '|'
character) to do so:

```yaml
statements:
 - |
  This is a statement, and the file format doesn't
  know how statements will be used!
 - |
  submit job {alpha} on queue {beta} with options {gamma};
```

Notice that the block starts on the following line after the pipe symbol. This
is a very popular form in practice because it treats the whole block exactly as
it is shown, except for the initial indentations, which are removed.

Statements in this format can be raw statements, statement templates, or
anything that is appropriate for the specific activity type they are being used
with. Generally, the statements should be thought of as a statement form that
you want to use in your activity -- something that has place holders for data
bindings. These place holders are called *named anchors*. The second line above
is an example of a statement template, with anchors that can be replaced by data
for each cycle of an activity.

There is a variety of ways to represent block statements, with folding, without,
with the newline removed, with it retained, with trailing newlines trimmed or
not, and so forth. For a more comprehensive guide on the YAML conventions
regarding multi-line blocks, see [YAML Spec 1.2, Chapter 8, Block
Styles](http://www.yaml.org/spec/1.2/spec.html#Block)

### Statement Overrides

In addition to the basic statement forms explained above in [Statement
Sequences](#statement-sequences), there is another called a *statement config map*:

```yaml
# a list of statement config maps
statements:
 - name: name1
   stmt: statement one
 - name: name2
   stmt: statement two
```

This is the most flexible configuration format at the statement level, however
it is also the most verbose. Because this format names each property of the
statement, it allows for other properties to be defined at this level as well.
This includes all of the previously described configuration elements: bindings,
params, and tags. A detailed example follows:

```yaml
statements:
 - name: foostmt
   stmt: "{alpha},{beta}\n"
   bindings:
    beta: Combinations('COMBINATIONS;')
   params:
    parm1: pvalue1
   tags:
    tag1: tvalue1
   freeparam3: a value, as if it were assigned under the params block.
```

In this case, the values for `bindings`, `params`, and `tags` take precedence,
overriding those set by the enclosing block or document or activity when the
names match. Additionally, parameters called **free parameters** are allowed here,
such as `freeparam3`. These are simply values that get assigned to the params
map once all other processing has completed.

It is possible to mix the **`<name>: <statement>`** form as above in the
example for mapping statement by name, so long as some specific rules are
followed. An example, which is equivalent to the above:

```yaml
statements:
 - foostmt: "{alpha},{beta}\n"
   parm1: pvalue1
   bindings:
    beta: Combinations('COMBINATIONS;')
   tags:
    tag1: tvalue1
```

In the example above, `parm1: pvalue` is known as a free parameter, and is
simply short-hand for setting values in the params map for the statement.

In this case, you must avoid using both the name property and the initial
**`<name>: <statement>`** together. Doing so will cause an error to be thrown.
Further, it is not possible to detect when the user has combined both the
**`<name>: <statement>`** form and the **`stmt: <statement>`**, so use caution
when mixing forms.

It is indeed possible to use any of the three list/map statement forms within
each entry of a statement list:

```yaml
statements:
 - first statement body
 - second: second statement body
 - third: third statement body
   freeparam1: freeparamvalue1
   tags:
    type: preload
 - name: statement4
   stmt: fourth statement body
```

The above is valid EngineBlock YAML, although a reader would need to know about
the rules explained above in order to really make sense of it. For most cases,
it is best to follow one format convention.

## Multi-Docs

The YAML spec allows for multiple yaml documents to be concatenated in the
same file with a separator:

```yaml
---
```

This offers an additional convenience when configuring activities. If you want
to parameterize or tag some a set of statements with their own bindings, params,
or tags, but alongside another set of uniquely configured statements, you need
only put them in separate logical documents, separated by a triple-dash.
For example:

```text
[test]$ cat > stdout-test.yaml
bindings:
 docval: WeightedStrings('doc1.1:1;doc1.2:2;')
statements:
 - "doc1.form1 {docval}\n"
 - "doc1.form2 {docval}\n"
---
bindings:
 numname: NumberNameToString()
statements:
 - "doc2.number {numname}\n"
# EOF (control-D in your terminal)
[test]$ ./eb run type=stdout yaml=stdout-test cycles=10
doc1.form1 doc1.1
doc1.form2 doc1.2
doc2.number two
doc1.form1 doc1.2
doc1.form2 doc1.1
doc2.number five
doc1.form1 doc1.2
doc1.form2 doc1.2
doc2.number eight
doc1.form1 doc1.1
```

## Template Params

All EngineBlock YAML formats support a parameter macro format that applies before
YAML processing starts. It is a basic macro facility that allows named
anchors to be placed in the document as a whole:

```text
<<varname:defaultval>>
```

In this example, the name of the parameter is <code>varname</code>. It is given a default
value of <code>defaultval</code>. If an activity parameter named *varname* is provided, as
in <code>varname=barbaz</code>, then this whole expression including the double angle
brackets will be replaced with <code>barbaz</code>. If none is provided then the default
value. For example:

```text
[test]$ cat > stdout-test.yaml
statements:
 - "<<linetoprint:MISSING>>\n"
# EOF (control-D in your terminal)

[test]$ ./eb run type=stdout yaml=stdout-test cycles=1
MISSING

[test]$ ./eb run type=stdout yaml=stdout-test cycles=1 linetoprint="THIS IS IT"
THIS IS IT
```

If an empty value is desired by default, then simply use an empty string in your template,
like `<<varname:>>`.

## Naming Things

Docs, Blocks, and Statements can all have names:

```yaml
name: doc1
blocks:
 - name: block1
   statements:
   - stmt1: statement1
   - name: st2
     stmt: statement2
---
name: doc2
...
```

This provides a layered naming scheme for the statements themselves. It is not
usually important to name things except for documentation or metric naming
purposes.

### Automatic Naming

If no names are provided, then names are automatically created for blocks and
statements. Statements assigned at the document level are assigned to
"block0". All other statements are named with the format `doc#--block#--stmt#`.
For example, the full name of statement1 above would be `doc1--block1--stmt1`.

## Summary

That's all you need to know to start using the new format! As you can see, the
minimal requirements for this format are pretty light. At the same time, the
level of sophistication can increase as needed for more advanced cases.

