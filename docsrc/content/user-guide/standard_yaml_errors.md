---
date: 2017-10-24T00:00:00
title: YAML Config Errors
weight: 12
menu:
  main:
    parent: User Guide
    identifier: configfiles-diagnostics
    weight: 22
---

This page describes errors that you might see if you have a YAML loading issue, and what
you can do to fix them.

# Statement Loading

Because the standard YAML format supports a variety of convenient formats for statement
definitions, it can sometimes be difficult to know what the user intended to do specifically.
The following is a brief description of how YAML statements are loaded, and can help explain
why some of the errors below may occur.

## YAML Statement Forms

### a single statement

If the statement value is a single string, it is taken as the only statement in the block:

    statements: my only statement

### a list of statements

If the statement value is a list of strings, then each one is taken as a statement, and default
statement naming occurs with names in the form `stmt+index`, starting with index 1, within the block.

    statements:
     - first statement
     - second statement

### a map of statements by name

If the statement value is a map, then each key-value entry is taken as a name-statement tuple:

    statements:
     s1: first statement
     s2: second statement

### a list of statement config maps

Finally, if the statement value is a list of maps, each entry is taken as a statement configuration map,
having all the flexibility of the other standard YAML levels, but with a few caveats around
reserved property names. For details on how this works, see the standard yaml documentation.

    statements:
     - stmt: first statement
       name: mystmtname
     - a-name: second statement

It is in the last example that most errors can occur, due to the need to recognize reserved property names
while also allowing for the name-statement tuple form as in the 'map of statements by name' example above.
In this mode, the first non-reserved property name is taken as the name, and the associated value as the
statement. All other non-reserved property names are taken as parameters as if they were put into a `params`
block.

# Exception Glossary

## Undefined Name-Statement Tuple

This exception is thrown when the statement body is not found in a statement definition
in any of the supported formats. For example, the following block will cause an error:

    statements:
     - name: statement-foo
       params:
        aparam: avalue

This is because `name` and `params` are reserved property names -- removed from the list of name-value
pairs before free parameters are read. If the statement is not defined before free parameters
are read, then the first free parameter is taken as the name and statement in `name: statement` form.

To correct this error, supply a statement property in the map, or simply replace the `name: statement-foo` entry
with a `statement-foo: statement body` at the top of the map:

Either of these will work:

    statements:
     - name: statement-foo
       stmt: statement body
       params:
        aparam: avalue

    statements:
     - statement-foo: statement body
       params:
        aparam: avalue

In both cases, it is clear to the loader where the statement body should come from, and what (if any) explicit
naming should occur.

## Redefined Name-Statement Tuple

This exception is thrown when the statement name is defined in multiple ways. This is an explicit exception
to avoid possible ambiguity about which value the user intended. For example, the following statements
definition will cause an error:

    statements:
     - name: name1
       name2: statement body

This is an error because the statement is not defined before free parameters are read, and the `name: statement`
form includes a second definition for the statement name. In order to correct this, simply remove the separate
`name` entry, or use the `stmt` property to explicitly set the statement body. Either of these will work:

    statements:
     - name2: statement body

    statements:
     - name: name1
       stmt: statement body

In both cases, there is only one name defined for the statement according to the supported formats.

## YAML Parsing Error

This exception is thrown when the YAML format is not recognizable by the YAML parser. If you are not
working from examples that are known to load cleanly, then please review your document for correctness
according to the [YAML Specification]().

If you are sure that the YAML should load, then please [submit a bug report](https://github.com/engineblock/engineblock/issues/new?labels=bug)
 with details on the type of YAML file you are trying to load.

## YAML Construction Error

This exception is thrown when the YAML was loaded, but the configuration object was not able to be constructed
from the in-memory YAML document. If this error occurs, it may be a bug in the YAML loader implementation.
Please [submit a bug report](https://github.com/engineblock/engineblock/issues/new?labels=bug) with details
on the type of YAML file you are trying to load.