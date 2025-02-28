import { Fragment } from "react";

function ListGroup() {
  return ( // '()' important if you wanna break you jsx into multiple lines!
    
    // instead of a div or something like that, we have a better solution, a fragment for multiple elements return
    <Fragment>
        <h1>Heading here for the sake of the example!</h1>
        <ul className="list-group">
          <li className="list-group-item">An item</li>
          <li className="list-group-item">A second item</li>
          <li className="list-group-item">A third item</li>
          <li className="list-group-item">A fourth item</li>
          <li className="list-group-item">And a fifth one</li>
        </ul>
    </Fragment>
  );
  // this is the compatible jsx code with the bootstrap styling brought from the bootstrap docs
  // you'll get an error first bcz 'class' is a reserved word in js and ts so change it all to className, for multiple selection press ctrl + d and keep pressing d untill you select them all and then type your changes!
  // press esc tp disable multi cursor editing
}

export default ListGroup;
