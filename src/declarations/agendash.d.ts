declare module 'agendash' {
    import { Agenda } from 'agenda';
    import { Request, Response, NextFunction } from 'express';
  
    // Define the Agendash middleware function
    function Agendash(agenda: Agenda): (req: Request, res: Response, next: NextFunction) => void;
  
    export default Agendash;
  }