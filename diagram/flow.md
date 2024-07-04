<center>

<h1>ETL Pipeline</h1>

```mermaid 
graph TD

A[Full Music Sheet] --> |Sheet to Treble| B[Treble Clef Notes]
B --> |Treble to Notes| C[Individual Notes]
C --> |Notes to .musicjson| D[.musicjson file]
```

</center>