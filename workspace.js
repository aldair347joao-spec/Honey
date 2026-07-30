/*
==========================================
HONEY IA
Workspace Manager
Versão 1.0
==========================================
*/

class workspace {

    constructor(){

        this.currentProject = null;

        this.projects = [];

    }

    create(name){

        const project = {

            id: Date.now().toString(),

            name,

            createdAt: new Date(),

            updatedAt: new Date(),

            files: [],

            chats: [],

            notes: [],

            settings:{}

        };

        this.projects.push(project);

        this.currentProject = project;

        return project;

    }

    getCurrent(){

        return this.currentProject;

    }

    setCurrent(id){

        const project = this.projects.find(p=>p.id===id);

        if(project){

            this.currentProject = project;

        }

        return project;

    }

    getAll(){

        return this.projects;

    }

    addFile(file){

        if(!this.currentProject) return;

        this.currentProject.files.push(file);

        this.currentProject.updatedAt = new Date();

    }

    addChat(message){

        if(!this.currentProject) return;

        this.currentProject.chats.push(message);

        this.currentProject.updatedAt = new Date();

    }

    addNote(note){

        if(!this.currentProject) return;

        this.currentProject.notes.push(note);

        this.currentProject.updatedAt = new Date();

    }

}

export default new Workspace();
