# C/C++ Interop

STruC++ provides two mechanisms for calling C/C++ code from Structured Text programs.

## 1. `{external ...}` Pragma

Embed raw C++ code directly inside ST program bodies. The code is emitted **as-is** into the generated `.cpp` file.

### Syntax

```st
PROGRAM Main
  VAR_INPUT speed : INT; END_VAR
  VAR_OUTPUT result : INT; END_VAR
  {external
    // C++ code here — variables are visible as IECVar<T>
    result.set(speed.get() * 2);
    printf("speed = %d\n", speed.get());
  }
END_PROGRAM
```

### Generated Output

```cpp
namespace strucpp {
  void Main_run() {
    IEC_INT speed{0};
    IEC_INT result{0};
    // ... variable declarations ...
    // Your {external ...} code appears here:
    result.set(speed.get() * 2);
    printf("speed = %d\n", speed.get());
  }
}
```

### Variable Access

Inside `{external ...}` blocks, IEC variables are `IECVar<T>` objects. Use:

- `.get()` — read value
- `.set(value)` — write value
- `.raw_ptr()` — get `T*` for located variables (I/O binding)

## 2. `pouIncludes` Compiler Option

Inject `#include` directives at the top of every generated POU file. This is used by the OpenPLC Editor to include `c_blocks.h` for C Block compatibility.

### Usage

```typescript
const result = compile(source, {
  pouIncludes: ['c_blocks.h', 'my_headers.h']
});
```

### Generated Output

```cpp
#include "generated.hpp"   // strucpp runtime
#include "c_blocks.h"      // your header
#include "my_headers.h"    // your header
// ... rest of generated code ...
```

### Purpose

When the OpenPLC Editor detects C Blocks in a project, it:

1. Generates `c_blocks.h` with function declarations (`<name>_setup`, `<name>_loop`)
2. Sets `pouIncludes: ['c_blocks.h']`
3. The generated `.cpp` files include this header
4. ST code can call the declared functions

## Calling External C++ Functions

### Recommended: Declare as ST Function

For type safety, wrap C++ calls in an ST function declaration:

```st
FUNCTION MultiplyByTwo : INT
  VAR_INPUT x : INT; END_VAR
  {external return x.get() * 2;}
END_FUNCTION

PROGRAM Main
  VAR result : INT; END_VAR
  result := MultiplyByTwo(21);  // ST compiler validates signature
END_FUNCTION
```

This approach gives you:

- **Type checking** — ST compiler validates parameter types at compile time
- **IDE support** — completion, hover, signature help work correctly
- **Code clarity** — the function signature is explicit

### Alternative: Inline C++ (No Type Checking)

For quick prototyping, embed C++ directly without a function declaration:

```st
PROGRAM Main
  {external
    printf("Hello from C++\n");
  }
END_PROGRAM
```

Note: The ST compiler does **not** validate calls inside `{external ...}` blocks. Type errors are caught by the C++ compiler.

## Standard Functions (No Extra Setup Needed)

All IEC 61131-3 standard functions are pre-bound to the `strucpp` runtime:

```st
PROGRAM Main
  VAR x : INT; END_VAR
  x := ABS(-42);         // mapped to strucpp::ABS()
  x := ADD(1, 2, 3);     // mapped to strucpp::ADD()
  x := TO_REAL(x);       // mapped to strucpp::TO_REAL()
END_PROGRAM
```

No `{external ...}` or `pouIncludes` needed — these are automatically available.

## Summary

| Mechanism | Type Checking | Use Case |
|-----------|---------------|----------|
| `{external ...}` | C++ compiler only | Inline C++ code in ST bodies |
| `pouIncludes` | C++ compiler only | OpenPLC C Block compatibility |
| ST function + `{external ...}` | Both ST and C++ compilers | Calling external C++ functions with type safety |
| Standard functions | ST compiler | IEC 61131-3 built-in functions (ABS, ADD, etc.) |
