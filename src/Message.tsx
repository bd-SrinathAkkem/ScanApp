// We're creating a react component here


function Message() { // naming fucntions with PascalCasing following the convention
    
    // for dynamic behavior : 

    const name = null;

    if (name) 
        
        return <h1>hello, {name}</h1>; // thiese braces we can write any js expression
        // a js expression is any code that produces/returns a value, so you can even call a fucntion inside those {}
    
    return <h1>hello world</h1>; 
    


    // This type of code is called JSX : js XMl that will be compiled to js code, you can check its equivalent in js on babeljs.js/repl

}

// to use it, we wanna explore it as a default object from this module, what does that mean ?

export default Message