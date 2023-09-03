function ELF(){}

ELF.prototype.loadFile = function(file){
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = (event) => {
            resolve(event.target.result);
        };
    });
};

ELF.prototype.parseELF = function(arrayBuffer){
    
    this.file_length = arrayBuffer.byteLength;
    
    this.elfFile = new DataView(arrayBuffer, 0, arrayBuffer.byteLength);
    
    try{
        this.e_ident = this.processEIdent();
    }catch(error){
        console.log(error);
    }
    
    // check if file is lsb or msb
    this.is_lsb = this.e_ident.EI_DATA.value == "ELFDATA2LSB";
    // check if file is 64 or 32 bit architecture
    this.is_64 = this.e_ident.EI_CLASS.value == "ELFCLASS64";
    // assign correct data types depending on bit-architecture
    this.data_types = this.is_64 ? elf_base_types[64] : elf_base_types[32];


    
    this.elf_contents = {}
    this.elf_contents.e_ident = this.e_ident;
    this.elf_contents.elf_hdr = this.processElfHdr()

    // check what architecture file is (just a convient shortcut, less typing)
    this.architecture = this.elf_contents.elf_hdr.e_machine.value;

    this.elf_contents.elf_phdr = this.processElfPhdr()
    this.elf_contents.elf_shdr = this.processElfShdr();
    this.elf_contents.elf_dyn = this.processElfDyn();
    this.elf_contents.elf_symtab = this.processElfSymtab();
    this.elf_contents.elf_dynsymtab = this.processElfDynSymtab();
    this.elf_contents.elf_reloc = this.processElfRelocation();
    
    
};

ELF.prototype.processEIdent = function(){
    
    let eident_offset = 0;
    
    /*
    The first byte of the magic number.  It must be filled with ELFMAG0.  (0: 0x7f) 
    */
    const EI_MAG0 = {
        value : this.elfFile.getUint8(eident_offset),
        raw_dec : this.elfFile.getUint8(eident_offset).toString(),
        raw_hex : this.elfFile.getUint8(eident_offset).toString(16),
        size_bytes : 1,
        offset : eident_offset,
        name : "EI_MAG0"
    };
    // move forward one byte in the e_ident array
    eident_offset += 1; 
    
    /*
    The second byte of the magic number.  It must be filled with ELFMAG1.  (1: 'E')
    */
    const EI_MAG1 = {
        value : this.elfFile.getUint8(eident_offset),
        raw_dec : this.elfFile.getUint8(eident_offset).toString(),
        raw_hex : this.elfFile.getUint8(eident_offset).toString(16),
        size_bytes : 1,
        offset : eident_offset,
        name : "EI_MAG1"
    };
    eident_offset += 1;
    
    /*
    The third byte of the magic number.  It must be filled with ELFMAG2.  (2: 'L')
    */
    const EI_MAG2 = {
        value : this.elfFile.getUint8(eident_offset),
        raw_dec : this.elfFile.getUint8(eident_offset).toString(),
        raw_hex : this.elfFile.getUint8(eident_offset).toString(16),
        size_bytes : 1,
        offset : eident_offset,
        name : "EI_MAG2"
    };
    eident_offset += 1;
    
    /*
    The fourth byte of the magic number.  It must be filled with ELFMAG3.  (3: 'F')
    */
    const EI_MAG3 = {
        value : this.elfFile.getUint8(eident_offset),
        raw_dec : this.elfFile.getUint8(eident_offset).toString(),
        raw_hex : this.elfFile.getUint8(eident_offset).toString(16),
        size_bytes : 1,
        offset : eident_offset,
        name : "EI_MAG3"
    };
    eident_offset += 1;
    
    // check if magic numbers are correct, if not, abort
    if(EI_MAG0.value != 127 ||  EI_MAG1.value != 69 || EI_MAG2.value != 76 || EI_MAG3.value != 70){
        const err = new Error("This does not appear to be an ELF-Binary - Magic numbers are wrong")
        throw err;
    }
    
    /* 
    ToDo: 
    readelf.c:check_magic_number checks for other file types (e.g. llvm and go)
    and suggest other tools - maybe do the same here!
    */
    
    
    /*
    The fifth byte identifies the architecture for this binary:
    */
    const EI_CLASS = {
        value : e_ident.EI_CLASS[this.elfFile.getUint8(eident_offset)],
        raw_dec : this.elfFile.getUint8(eident_offset).toString(),
        raw_hex : this.elfFile.getUint8(eident_offset).toString(16),
        size_bytes : 1,
        offset : eident_offset,
        name : "EI_CLASS"
    };
    eident_offset += 1;
    
    // check if class is invalid, if yes, abort
    if(EI_CLASS.value == "ELFCLASSNONE" || EI_CLASS.value == null){
        const err = new Error("None or invalid ELF-File Class: " + EI_CLASS.value);
        throw err;
    }
    
    /*
    The sixth byte specifies the data encoding of the processor-specific data in the file.
    */
    const EI_DATA = {
        value : e_ident.EI_DATA[this.elfFile.getUint8(eident_offset)],
        raw_dec : this.elfFile.getUint8(eident_offset).toString(),
        raw_hex : this.elfFile.getUint8(eident_offset).toString(16),
        size_bytes : 1,
        offset : eident_offset,
        name : "EI_DATA"
    };
    eident_offset += 1;
    
    // check if data encoding is invalid, if yes, abort
    if(EI_DATA.value == "ELFDATANONE" || EI_DATA.value == null){
        const err = new Error("None or invalid ELF-File Data Encoding: " + EI_DATA.value);
        throw err;
    }
    
    /*
    The seventh byte is the version number of the ELF specification:
    */
    const EI_VERSION = {
        value : e_ident.EI_VERSION[this.elfFile.getUint8(eident_offset)],
        raw_dec : this.elfFile.getUint8(eident_offset).toString(),
        raw_hex : this.elfFile.getUint8(eident_offset).toString(16),
        size_bytes : 1,
        offset : eident_offset,
        name : "EI_VERSION"
    };
    eident_offset += 1;
    
    /*
    The  eighth byte identifies the operating system and ABI to which the 
    object is targeted. Some fields in other ELF structures have flags 
    and values that have platform-specific meanings; the interpretation 
    of those fields is determined by the value of this byte.
    */
    const EI_OSABI = {
        value : e_ident.EI_OSABI[this.elfFile.getUint8(eident_offset)],
        raw_dec : this.elfFile.getUint8(eident_offset).toString(),
        raw_hex : this.elfFile.getUint8(eident_offset).toString(16),
        size_bytes : 1,
        offset : eident_offset,
        name : "EI_OSABI"
    };
    eident_offset += 1;
    
    /*
    The ninth byte identifies the version of the ABI to which the 
    object is targeted. This field is used to distinguish among 
    incompatible versions of an  ABI. The  interpretation  of
    this version number is dependent on the ABI identified by the 
    EI_OSABI field. Applications conforming to this specification use the value 0
    */
    const EI_ABIVERSION = {
        value : this.elfFile.getUint8(eident_offset),
        raw_dec : this.elfFile.getUint8(eident_offset).toString(),
        raw_hex : this.elfFile.getUint8(eident_offset).toString(16),
        size_bytes : 1,
        offset : eident_offset,
        name : "EI_ABIVERSION"
    };
    eident_offset += 1;
    
    
    /*
    Start of padding. These bytes are reserved and set to zero.  
    Programs which read them should ignore them.  
    The value for EI_PAD will change in the future if currently unused bytes
    are given meanings.
    */
    const EI_PAD = {
        value : this.elfFile.getUint8(eident_offset),
        raw_dec : this.elfFile.getUint8(eident_offset).toString(),
        raw_hex : this.elfFile.getUint8(eident_offset).toString(16),
        size_bytes : 6, //its actually just one byte but we need this for padding up to offset 15
        offset : eident_offset,
        name : "EI_PAD"
    };
    eident_offset = 15;
    
    /*
    The size of the e_ident array.
    */
    const EI_NIDENT = {
        value : this.elfFile.getUint8(eident_offset),
        raw_dec : this.elfFile.getUint8(eident_offset).toString(),
        raw_hex : this.elfFile.getUint8(eident_offset).toString(16),
        size_bytes : 1,
        offset : eident_offset,
        name : "EI_NIDENT"
    };
    
    
    return{
        EI_MAG0 : EI_MAG0,
        EI_MAG1 : EI_MAG1,
        EI_MAG2 : EI_MAG2,
        EI_MAG3 : EI_MAG3,
        EI_CLASS : EI_CLASS,
        EI_DATA : EI_DATA,
        EI_VERSION : EI_VERSION,
        EI_OSABI : EI_OSABI,
        EI_ABIVERSION : EI_ABIVERSION,
        EI_PAD : EI_PAD,
        EI_NIDENT : EI_NIDENT
    }
};


ELF.prototype.processElfHdr32 = function(){
    
};

ELF.prototype.processElfHdr64 = function(){
    
    let hdr_offset = 16;
    
    /* This member of the structure identifies the object file type */
    const e_type = {
        value : elf_hdr.e_type[this.elfFile.getUint16(hdr_offset, this.is_lsb)],
        raw_dec : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(),
        raw_hex : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(16),
        size_bytes : this.data_types.Elf_Half,
        offset : hdr_offset,
        name : "e_type"
    };
    hdr_offset += this.data_types.Elf_Half;
    
    
    /* This member of the structure identifies the object file type */
    const e_machine = {
        value : elf_hdr.e_machine[this.elfFile.getUint16(hdr_offset, this.is_lsb)],
        raw_dec : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(),
        raw_hex : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(16),
        size_bytes : this.data_types.Elf_Half,
        offset : hdr_offset,
        name : "e_machine"
    };
    hdr_offset += this.data_types.Elf_Half;
    
    /* This member of the structure identifies the object file type */
    const e_version = {
        value : elf_hdr.e_version[this.elfFile.getUint16(hdr_offset, this.is_lsb)],
        raw_dec : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(),
        raw_hex : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(16),
        size_bytes : this.data_types.Elf_Word,
        offset : hdr_offset,
        name : "e_version"
    };
    hdr_offset += this.data_types.Elf_Word;
    
    /* 
    This member gives the virtual address to which the system first 
    transfers control, thus starting the process.  
    If the file has no associated entry point, this member holds zero.
    */
    const e_entry = {
        value : Number(this.elfFile.getBigUint64(hdr_offset, this.is_lsb)),
        raw_dec : Number(this.elfFile.getBigUint64(hdr_offset, this.is_lsb)).toString(),
        raw_hex : Number(this.elfFile.getBigUint64(hdr_offset, this.is_lsb)).toString(16),
        size_bytes : this.data_types.Elf_Addr,
        offset : hdr_offset,
        name : "e_entry",
        action_type : "link"
    };
    hdr_offset += this.data_types.Elf_Addr;
    
    /* 
    This member holds the program header table's file offset in bytes.  
    If the file has no program header table, this member holds zero. 
    */
    const e_phoff = {
        value : Number(this.elfFile.getBigUint64(hdr_offset, this.is_lsb)),
        raw_dec : Number(this.elfFile.getBigUint64(hdr_offset, this.is_lsb)).toString(),
        raw_hex : Number(this.elfFile.getBigUint64(hdr_offset, this.is_lsb)).toString(16),
        size_bytes : this.data_types.Elf_Off,
        offset : hdr_offset,
        name : "e_phoff",
        action_type : "link"
    };
    hdr_offset += this.data_types.Elf_Off;
    
    /*
    This member holds the section header table's file offset in bytes.  
    If the file has no section header table, this member holds zero.
    */
    const e_shoff = {
        value : Number(this.elfFile.getBigUint64(hdr_offset, this.is_lsb)),
        raw_dec : Number(this.elfFile.getBigUint64(hdr_offset, this.is_lsb)).toString(),
        raw_hex : Number(this.elfFile.getBigUint64(hdr_offset, this.is_lsb)).toString(16),
        size_bytes : this.data_types.Elf_Off,
        offset : hdr_offset,
        name : "e_shoff",
        action_type : "link"
    };
    hdr_offset += this.data_types.Elf_Off;
    
    /* 
    This member holds processor-specific flags associated with the file.  
    Flag names take the form EF_`machine_flag'.  Currently, no flags have been defined.
    */
    const e_flags = {
        value : this.elfFile.getUint32(hdr_offset, this.is_lsb),
        raw_dec : this.elfFile.getUint32(hdr_offset, this.is_lsb).toString(),
        raw_hex : this.elfFile.getUint32(hdr_offset, this.is_lsb).toString(16),
        size_bytes : this.data_types.Elf_Word,
        offset : hdr_offset,
        name : "e_flags"
    };
    hdr_offset += this.data_types.Elf_Word;
    
    /* 
    This member holds the ELF header's size in bytes.
    */
    const e_ehsize = {
        value : this.elfFile.getUint16(hdr_offset, this.is_lsb),
        raw_dec : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(),
        raw_hex : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(16),
        size_bytes : this.data_types.Elf_Half,
        offset : hdr_offset,
        name : "e_ehsize"
    };
    hdr_offset += this.data_types.Elf_Half;
    
    /* 
    This member holds the size in bytes of one entry in the file's program header table; 
    all entries are the same size.
    */
    const e_phentsize = {
        value : this.elfFile.getUint16(hdr_offset, this.is_lsb),
        raw_dec : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(),
        raw_hex : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(16),
        size_bytes : this.data_types.Elf_Half,
        offset : hdr_offset,
        name : "e_phentsize"
    };
    hdr_offset += this.data_types.Elf_Half;
    
    /* 
    This member holds the number of entries in the program header table.  
    Thus the product of e_phentsize and e_phnum gives the table's size in bytes.  
    If a file has no program header,  e_phnum holds the value zero.
    */
    let e_phnum = {
        value : this.elfFile.getUint16(hdr_offset, this.is_lsb),
        raw_dec : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(),
        raw_hex : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(16),
        size_bytes : this.data_types.Elf_Half,
        offset : hdr_offset,
        name : "e_phnum"
    };
    hdr_offset += this.data_types.Elf_Half;
    
    /*
    If the number of entries in the program header table is larger than or equal to 
    PN_XNUM (0xffff), this member holds PN_XNUM (0xffff) and the real number of 
    entries in the program header table is held in the sh_info member of the initial 
    entry in section header table. 
    */
    
    if(e_phnum >= elf_hdr["PN_XNUM"]){
        e_phnum = elf_hdr.e_phnum[0xffff]; //PN_XNUM
    }
    
    /* 
    This member holds a sections header's size in bytes.  
    A section header is one entry in the section header table; 
    all entries are the same size.
    */
    const e_shentsize = {
        value : this.elfFile.getUint16(hdr_offset, this.is_lsb),
        raw_dec : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(),
        raw_hex : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(16),
        size_bytes : this.data_types.Elf_Half,
        offset : hdr_offset,
        name : "e_shentsize"
    };
    hdr_offset += this.data_types.Elf_Half;
    
    /* 
    This member holds the number of entries in the section header table.  
    Thus the product of e_shentsize and e_shnum gives the section header table's size in bytes.  
    If a file has  no  section header table, e_shnum holds the value of zero.
    */
    let e_shnum = {
        value : this.elfFile.getUint16(hdr_offset, this.is_lsb),
        raw_dec : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(),
        raw_hex : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(16),
        size_bytes : this.data_types.Elf_Half,
        offset : hdr_offset,
        name : "e_shnum"
    };
    hdr_offset += this.data_types.Elf_Half;
    
    /*
    If the number of entries in the section header table is larger than or equal to 
    SHN_LORESERVE (0xff00), e_shnum holds the value zero and the real number of entries 
    in the section header table is held in the sh_size member of the initial 
    entry in section header table.  
    */
    
    if(e_shnum >= elf_hdr["SHN_LORESERVE"]){
        e_shnum = 0;
    }
    
    /* 
    This member holds the section header table index of the entry 
    associated with the section name string table. 
    */
    let e_shstrndx = {
        value : this.elfFile.getUint16(hdr_offset, this.is_lsb),
        raw_dec : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(),
        raw_hex : this.elfFile.getUint16(hdr_offset, this.is_lsb).toString(16),
        size_bytes : this.data_types.Elf_Half,
        offset : hdr_offset,
        name : "e_shstrndx"
    };
    hdr_offset += this.data_types.Elf_Half;
    
    /*
    If the file has no section name string  table,  this  member  holds  the  value
    SHN_UNDEF.
    
    If the index of section name string table section is larger than or equal to 
    SHN_LORESERVE (0xff00), this member holds SHN_XINDEX (0xffff) and the real index 
    of the section name string table section is held in the sh_link member of 
    the initial entry in section header table.  
    */
    
    if(e_shstrndx == elf_hdr["SHN_UNDEF"]){
        e_shstrndx = elf_hdr.e_shstrndx[0]; //SHN_UNDEF
    }else if(e_shstrndx >= elf_hdr["SHN_LORESERVE"]){
        e_shstrndx = elf_hdr.e_shstrndx[0xffff]; // SHN_XINDEX
    }
    
    
    return{
        e_type : e_type,
        e_machine : e_machine,
        e_version : e_version,
        e_entry : e_entry,
        e_phoff : e_phoff,
        e_shoff : e_shoff,
        e_flags : e_flags,
        e_ehsize : e_ehsize,
        e_phentsize : e_phentsize,
        e_phnum : e_phnum,
        e_shentsize : e_shentsize,
        e_shnum : e_shnum,
        e_shstrndx : e_shstrndx
    }
};

ELF.prototype.processElfPhdr32 = function(){
    
};

ELF.prototype.processElfPhdr64 = function(){
    
    let phdr_entries = [];
    
    for(let phdr_entry_count = 0; phdr_entry_count < this.elf_contents.elf_hdr.e_phnum.value; phdr_entry_count++){
        
        let phdr_entry_offset = this.elf_contents.elf_hdr.e_phoff.value + phdr_entry_count * this.elf_contents.elf_hdr.e_phentsize.value;
        
        /*
        This member of the structure indicates what kind of segment this array element 
        describes or how to interpret the array element's information.
        */
        const p_type = {
            value : elf_phdr.p_type[this.elfFile.getUint32(phdr_entry_offset, this.is_lsb)],
            raw_dec : this.elfFile.getUint32(phdr_entry_offset, this.is_lsb).toString(),
            raw_hex : this.elfFile.getUint32(phdr_entry_offset, this.is_lsb).toString(16),
            size_bytes : this.data_types.Elf_Word,
            offset : phdr_entry_offset,
            name : "p_type"
        };
        phdr_entry_offset += this.data_types.Elf_Word;
        
        
        /*
        This member holds a bit mask of flags relevant to the segment:
        */
        const p_flags = {
            value : this.getSetFlags(this.elfFile.getUint32(phdr_entry_offset, this.is_lsb), elf_phdr.p_flags),
            raw_dec : this.elfFile.getUint32(phdr_entry_offset, this.is_lsb).toString(),
            raw_hex : this.elfFile.getUint32(phdr_entry_offset, this.is_lsb).toString(16),
            size_bytes : this.data_types.Elf_Word,
            offset : phdr_entry_offset,
            name : "p_flags"
        };
        phdr_entry_offset += this.data_types.Elf_Word;
        
        
        /*
        This member holds the offset from the beginning of the file at which the first byte of the segment resides.
        */
        const p_offset = {
            value : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Off,
            offset : phdr_entry_offset,
            name : "p_offset"
        };
        phdr_entry_offset += this.data_types.Elf_Off;
        
        
        /*
        This member holds the virtual address at which the first byte of the segment resides in memory.
        */
        const p_vaddr = {
            value : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Addr,
            offset : phdr_entry_offset,
            name : "p_vaddr"
        };
        phdr_entry_offset += this.data_types.Elf_Addr;
        
        
        /*
        On systems for which physical addressing is relevant, this member is reserved for the segment's physical address.  
        Under BSD this member is not used and must be zero.
        */
        const p_paddr = {
            value : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Addr,
            offset : phdr_entry_offset,
            name : "p_paddr"
        };
        phdr_entry_offset += this.data_types.Elf_Addr;
        
        
        /*
        This member holds the number of bytes in the file image of the segment.  It may be zero.
        */
        const p_filesz = {
            value : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Addr,
            offset : phdr_entry_offset,
            name : "p_filesz"
        };
        phdr_entry_offset += this.data_types.Elf_Xword;
        
        
        /*
        This member holds the number of bytes in the memory image of the segment.  It may be zero.
        */
        const p_memsz = {
            value : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Addr,
            offset : phdr_entry_offset,
            name : "p_memsz"
        };
        phdr_entry_offset += this.data_types.Elf_Xword;
        
        
        /*
        This  member  holds  the  value  to which the segments are aligned in memory and in the file.  
        Loadable process segments must have congruent values for p_vaddr and p_offset, modulo the page
        size. Values of zero and one mean no alignment is required.
        Otherwise, p_align should be a positive, integral power of two, and p_vaddr should equal p_offset, modulo p_align.
        */
        const p_align = {
            value : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(phdr_entry_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Addr,
            offset : phdr_entry_offset,
            name : "p_align"
        };
        phdr_entry_offset += this.data_types.Elf_Xword;
        
        let phdr_entry = {
            offset : p_type.offset.toString(16),
            p_type : p_type,
            p_flags : p_flags,
            p_offset : p_offset,
            p_vaddr : p_vaddr,
            p_paddr : p_paddr,
            p_filesz : p_filesz,
            p_memsz : p_memsz,
            p_align : p_align
        };
        
        phdr_entries.push(phdr_entry);
        
    }
    
    return phdr_entries;
    
};

ELF.prototype.getStringFromStringTable = function(offset) {
    
    // Initialize an array to store the characters
    let chars = [];
    
    // Read the first character from the given offset in the ELF file
    let currentChar = this.elfFile.getUint8(offset, this.is_lsb);
    
    // Initialize an offset counter to track the read position
    let offsetCounter = 0;
    
    // Continue reading characters until a null byte (0) is encountered
    while (currentChar !== 0) {
        // Add the current character to the array
        chars.push(String.fromCharCode(currentChar));
        
        // Increment the offset counter
        offsetCounter++;
        
        // Read the next character from the ELF file
        currentChar = this.elfFile.getUint8(offset + offsetCounter, this.is_lsb);
    }
    
    // Join the characters into a string and return the result
    return chars.join("");
}

ELF.prototype.processElfShdr32 = function(){
    // elf32_shdr and elf64_shdr structs are, member-order-wise, exactly the same
    // so we can just re-use the 64-bit function
    return this.processElfShdr64();
};

ELF.prototype.processElfShdr64 = function(){
    
    /*
    Get .shstrtab-section offset so we can resolve sh_name
    - e_shstrndx contains section header index to .shstrtab (e.g. 36)
    - therefore, e_shstrndx can be used to fetch offset address of 
    actual .shstrtab section (e.g. 0x3eb4)
    - sh_name is then just an index offset (e.g. 27) into the section header string table section
    */
    const shstrtab_entry_offset = this.elf_contents.elf_hdr.e_shoff.value + this.elf_contents.elf_hdr.e_shstrndx.value * this.elf_contents.elf_hdr.e_shentsize.value;
    const shstrtab_sh_offset = Number(this.elfFile.getBigUint64(shstrtab_entry_offset + 24, this.is_lsb));
    
    let shdr_entries = [];
    
    for(let shdr_entry_count = 0; shdr_entry_count < this.elf_contents.elf_hdr.e_shnum.value; shdr_entry_count++){
        
        // calculate shdr_entry offset
        let shdr_entry_offset = this.elf_contents.elf_hdr.e_shoff.value + shdr_entry_count * this.elf_contents.elf_hdr.e_shentsize.value;
        
        /*
        This member specifies the name of the section. 
        Its value is an index into the section header string table section, 
        giving the location of a null-terminated string.
        */
        const sh_name_offset = this.elfFile.getUint32(shdr_entry_offset, this.is_lsb);
        const sh_name = {
            value : this.getStringFromStringTable(shstrtab_sh_offset + sh_name_offset),
            raw_dec : this.elfFile.getUint32(shdr_entry_offset, this.is_lsb).toString(),
            raw_hex : this.elfFile.getUint32(shdr_entry_offset, this.is_lsb).toString(16),
            size_bytes : this.data_types.Elf_Word,
            offset : shdr_entry_offset,
            name : "sh_name"
        };
        shdr_entry_offset += this.data_types.Elf_Word;
        
        /*
        This member categorizes the section's contents and semantics.
        */
        const sh_type = {
            value : elf_shdr.sh_type[this.elfFile.getUint32(shdr_entry_offset, this.is_lsb)],
            raw_dec : this.elfFile.getUint32(shdr_entry_offset, this.is_lsb).toString(),
            raw_hex : this.elfFile.getUint32(shdr_entry_offset, this.is_lsb).toString(16),
            size_bytes : this.data_types.Elf_Word,
            offset : shdr_entry_offset,
            name : "sh_type"
        };
        shdr_entry_offset += this.data_types.Elf_Word;
        
        /*
        Sections support one-bit flags that describe miscellaneous attributes.  
        If a flag bit is set in sh_flags, the attribute is "on" for the section.  
        Otherwise, the attribute is "off"  or  does not apply.  
        Undefined attributes are set to zero.
        */
        const sh_flags = {
            value : this.getSetFlags(this.elfFile.getUint32(shdr_entry_offset, this.is_lsb), elf_shdr.sh_flags),
            raw_dec : this.elfFile.getUint32(shdr_entry_offset, this.is_lsb).toString(),
            raw_hex : this.elfFile.getUint32(shdr_entry_offset, this.is_lsb).toString(16),
            size_bytes : this.data_types.Elf_Xword,
            offset : shdr_entry_offset,
            name : "sh_flags"
        };
        shdr_entry_offset += this.data_types.Elf_Xword;
        
        /*
        If this section appears in the (virtual) memory image of a process, this member 
        holds the address at which the section's first byte should reside.  
        Otherwise, the member contains zero.
        */
        
        const sh_addr = {
            value : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Addr,
            offset : shdr_entry_offset,
            name : "sh_addr"
        };
        shdr_entry_offset += this.data_types.Elf_Addr;
        
        /*
        This  member's value holds the byte offset from the beginning of the file to 
        the first byte in the section. One section type, SHT_NOBITS, occupies no space 
        in the file, and its sh_offset member locates the conceptual placement in the file.
        */
        const sh_offset = {
            value : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Off,
            offset : shdr_entry_offset,
            name : "sh_offset"
        };
        shdr_entry_offset += this.data_types.Elf_Off;
        
        /*
        This member holds the section's size in bytes. Unless the section type is SHT_NOBITS, 
        the section occupies sh_size bytes in the file. A section of type SHT_NOBITS may have a nonzero size,
        but it occupies no space in the file.
        */
        const sh_size = {
            value : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Xword,
            offset : shdr_entry_offset,
            name : "sh_size"
        };
        shdr_entry_offset += this.data_types.Elf_Xword;
        
        /*
        This member holds a section header table index link, whose interpretation depends on the section type.
        */
        const sh_link = {
            value : this.elfFile.getUint32(shdr_entry_offset, this.is_lsb),
            raw_dec : this.elfFile.getUint32(shdr_entry_offset, this.is_lsb).toString(),
            raw_hex : this.elfFile.getUint32(shdr_entry_offset, this.is_lsb).toString(16),
            size_bytes : this.data_types.Elf_Word,
            offset : shdr_entry_offset,
            name : "sh_link"
        };
        shdr_entry_offset += this.data_types.Elf_Word;
        
        /*
        This member holds extra information, whose interpretation depends on the section type.
        */
        const sh_info = {
            value : this.elfFile.getUint32(shdr_entry_offset, this.is_lsb),
            raw_dec : this.elfFile.getUint32(shdr_entry_offset, this.is_lsb).toString(),
            raw_hex : this.elfFile.getUint32(shdr_entry_offset, this.is_lsb).toString(16),
            size_bytes : this.data_types.Elf_Word,
            offset : shdr_entry_offset,
            name : "sh_info"
        };
        shdr_entry_offset += this.data_types.Elf_Word;
        
        /*
        Some sections have address alignment constraints. If a section holds a doubleword, 
        the system must ensure doubleword alignment for the entire section. That is, the value of sh_addr must
        be congruent to zero, modulo the value of sh_addralign. 
        Only zero and positive integral powers of two are allowed. 
        The value 0 or 1 means that the section has no alignment constraints.
        */
        const sh_addralign = {
            value : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Xword,
            offset : shdr_entry_offset,
            name : "sh_addralign"
        };
        shdr_entry_offset += this.data_types.Elf_Xword;
        
        /*
        Some sections hold a table of fixed-sized entries, such as a symbol table.  
        For such a section, this member gives the size in bytes for each entry.  
        This member contains zero if the section
        does not hold a table of fixed-size entries.
        */
        const sh_entsize = {
            value : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(shdr_entry_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Xword,
            offset : shdr_entry_offset,
            name : "sh_entsize"
        };
        shdr_entry_offset += this.data_types.Elf_Xword;
        
        
        let shdr_entry = {
            sh_name : sh_name,
            sh_type : sh_type,
            sh_flags : sh_flags,
            sh_addr : sh_addr,
            sh_offset : sh_offset,
            sh_size : sh_size,
            sh_link : sh_link,
            sh_info : sh_info,
            sh_addralign : sh_addralign,
            sh_entsize : sh_entsize
        };
        
        shdr_entries.push(shdr_entry);
    }
    
    return shdr_entries;
    
    
    
};

ELF.prototype.assignFlagValues = function(d_tag, d_un){

    if(d_tag.value == "DT_FLAGS"){
        // DT_FLAGS
        d_un.value = this.parseFlagBits("DT_FLAGS", d_un.value);
    }else if (d_tag.value == "DT_FLAGS_1"){
        // DT_FLAGS_1
        d_un.value = this.parseFlagBits("DT_FLAGS_1", d_un.value);
    }else if(d_tag.value == "DT_POSFLAG_1"){
        // DT_POSFLAG_1
        d_un.value = this.parseFlagBits("DT_POSFLAG_1", d_un.value);
    }else if(d_tag.value == "DT_FEATURE"){
        // DT_FEATURE
        d_un.value = this.parseFlagBits("DT_FEATURE", d_un.value);
    }else if(d_tag.value == "DT_GNU_FLAGS_1"){
        // DT_GNU_FLAGS_1
        d_un.value = this.parseFlagBits("DT_GNU_FLAGS_1", d_un.value);
    }

    return d_un;

}

ELF.prototype.parseFlagBits = function(flag_type, d_un_val){
    
    let flags = [];

    while (d_un_val) {

        // isolates the least significant set bit im d_un_val
        const flag = d_un_val & -d_un_val;

        // clears the least significant set bit in flag
        d_un_val &= ~flag;

        // switch based on flag type
        switch(flag_type){
            case "DT_FLAGS":
                flags.push(DT_FLAGS[flag]);
                break;
            case "DT_FLAGS_1":
                flags.push(DT_FLAGS_1[flag]);
                break;
            case "DT_POSFLAG_1":
                flags.push(DT_POSFLAG_1[flag]);
                break;
            case "DT_FEATURE":
                flags.push(DT_FEATURE[flag]);
                break;
            case "DT_GNU_FLAGS_1":
                flags.push(DT_GNU_FLAGS_1[flag]);
                break;
        }
    }

    return flags;
}

ELF.prototype.processElfDyn32 = function(){
    
}

ELF.prototype.processElfDyn64 = function(){

    /*
    The .dynamic section contains a series of structures 
    that hold relevant dynamic linking information.
    
    This function processes the .dynamic section.
    */
    
    let dynamic = null;
    
    for(const element of this.elf_contents.elf_shdr){
        if(element.sh_type.value == "SHT_DYNAMIC"){
            dynamic = element;
        }
    }
    
    // check if dynamic section even exists, if not, return null
    if(dynamic == null){
        return null;
    }
    
    // get number of entries in dynamic section
    let dynamic_entries_number = dynamic.sh_size.value / dynamic.sh_entsize.value;

    let dynamic_entries = [];
    
    for(let dynamic_entry_count = 0; dynamic_entry_count < dynamic_entries_number; dynamic_entry_count++){
        
        // calculate offset
        let dynamic_offset = dynamic.sh_offset.value + (dynamic_entry_count * dynamic.sh_entsize.value);
        
        /*
        The d_tag member controls the interpretation of the d_un entry
        */
        const d_tag = {
            value : elf_dynamic.d_tag[this.elfFile.getBigInt64(dynamic_offset, this.is_lsb)],
            raw_dec : this.elfFile.getBigInt64(dynamic_offset, this.is_lsb).toString(),
            raw_hex : this.elfFile.getBigInt64(dynamic_offset, this.is_lsb).toString(16),
            size_bytes : this.data_types.Elf_Sxword,
            offset : dynamic_offset,
            name : "d_tag"
        };
        dynamic_offset += this.data_types.Elf_Sxword;
        
        let d_un = {
            value : Number(this.elfFile.getBigUint64(dynamic_offset, this.is_lsb)),
            raw_dec : this.elfFile.getBigUint64(dynamic_offset, this.is_lsb).toString(),
            raw_hex : this.elfFile.getBigUint64(dynamic_offset, this.is_lsb).toString(16),
            size_bytes : this.data_types.Elf_Xword,
            offset : dynamic_offset,
            name : "d_un"
        };
        dynamic_offset += this.data_types.Elf_Xword;

        d_un = this.assignFlagValues(d_tag, d_un);
        
        let dynamic_entry = {
            d_tag : d_tag,
            d_un : d_un
        }
        
        dynamic_entries.push(dynamic_entry);
        
    }

    return dynamic_entries;
    
}

ELF.prototype.getRelocType = function (r_info) {


    /*
    This member specifies the relocation type to apply. 
    We do some bit shifting and bitwise operation to get the 
    type. Also architecture dependant.
    */

    let r_type = null;
    let r_type_value = null; // the actual relocation type
    
    if (this.is_64) {

        switch (this.architecture) {
            case "EM_MIPS" :
                r_type = r_info.value & 0xff;
                break;
            case "EM_SPARCV9":
                r_type = r_info.value & 0xff;
                break;
            default:
                r_type = r_info.value & 0xffffffff;
        }

    }else {
        r_type = r_info.value & 0xff;
    }

    if (r_type == null) {
        return null;
    }

    switch (this.architecture) {
        case "EM_MIPS" :
            r_type_value = R_MIPS_TYPE[r_type];
            break;
        case "EM_SPARCV9":
            r_type_value = R_SPARC_TYPE[r_type];
            break;
        default:
            r_type_value = R_X86_64_TYPE[r_type];
    }

    const r_type_ret = {
        value : r_type_value,
        raw_dec : r_type.toString(),
        raw_hex : r_type.toString(16),
        size_bytes : null,
        offset : null,
        name : "r_type"
    };

    return r_type_ret;

}

ELF.prototype.getRelocSymbol = function (r_info, symtab) {

    let r_sym_idx = null;
    let symtab_reloc_symbols = null;

    if (this.is_64) {
        r_sym_idx = r_info.value >> 32;
    }else {
        r_sym_idx = r_info.value >> 8;
    }

    // if either the index or the symtab is null, just return null
    if (r_sym_idx == null || symtab == null) {
        return null;
    }

    /*
        We have to differentiate between different symbol tables,
        Namely SHT_DYNSYM and SHT_SYMTAB.
        The symbol refered to by r_sym_idx is in either of those.
        Whether the symbol is in SHT_DYNSYM or in SHT_SYMTAB depends
        ultimately on the type of section of the relocation:
    
        For Relocatable Files:

        In the case of a relocatable object file (like your main.o), the index usually refers to the .symtab (Symbol Table). 
        The .symtab contains both local and global symbols, and it's used by the linker to perform symbol resolution and relocation when combining relocatable object files.

        For Executable and Shared Libraries:

        For executables and shared libraries, the .dynsym (Dynamic Symbol Table) is typically used instead. 
        This is because .dynsym is the symbol table for dynamic linking, containing only the symbols that are needed for relocation at runtime. 
        .symtab could still exist, but it's often stripped to reduce the file size, and it's not used for dynamic linking. 
        You'll often see sections like .rela.dyn and .rela.plt refer to indices in .dynsym.
    */
    if (symtab.sh_type.value == "SHT_DYNSYM") {
        symtab_reloc_symbols = this.elf_contents.elf_dynsymtab;
    } else if (symtab.sh_type.value == "SHT_SYMTAB") {
        symtab_reloc_symbols = this.elf_contents.elf_symtab;
    } else {
        // if the symtab is neither of type SHT_DYNSYM nor of type SHT_SYMTAB, just return
        return null;
    }

    // check that r_sym_idx is not geq than symbol table length - 1
    if ( r_sym_idx >= symtab_reloc_symbols.length ) {
        return null;
    }

    console.log(symtab_reloc_symbols[r_sym_idx].st_name);

    return symtab_reloc_symbols[r_sym_idx].st_name;

}

ELF.prototype.processElfRelocation32 = function() {

}

ELF.prototype.processElfRelocation64 = function() {
    
    /*
    Relocation is the process of connecting symbolic references with symbolic definitions.  
    Relocatable files must have information that describes how to modify their section contents, thus allowing
    executable and shared object files to hold the right information for a process's program image.  
    Relocation entries are these data.

    */

    // find relocation section headers in section headers
    // these could be either of type SHT_REL, SHT_RELA or SHT_RELR depending on the binary
    let relocations_section_headers = [] 

    for(const section_header of this.elf_contents.elf_shdr){
        if(
            section_header.sh_type.value == "SHT_REL" || 
            section_header.sh_type.value == "SHT_RELA" || 
            section_header.sh_type.value == "SHT_RELR" 
        ){
            relocations_section_headers.push(
                {
                    sh_type: section_header.sh_type.value,
                    section_header : section_header
                }
            );
        }
    }

    let relocation_entries = [];


    for (const reloc of relocations_section_headers) {

        // get number of entries in relocation section
        let relocation_entries_number = reloc.section_header.sh_size.value / reloc.section_header.sh_entsize.value;

        // we have to set the name here because the sh_type might be the same for multiple relocation section headers
        // but the sh_name can be different
        // e.g. .rela.dyn and .rela.plt might both be of sh_type SHT_RELA
        let relocation_entry = {
            sh_name : reloc.section_header.sh_name
        };

        for(let relocation_entry_count = 0; relocation_entry_count < relocation_entries_number; relocation_entry_count++){

            // calculate offset
            let relocation_section_offset = reloc.section_header.sh_offset.value + (relocation_entry_count * reloc.section_header.sh_entsize.value);

            // This member gives the location at which to apply the relocation action. 
            // For a relocatable file, the value is the byte offset from the beginning of the section to the storage unit affected by the relocation. 
            // For an executable file or shared object, the value is the virtual address of the storage unit affected by the relocation.
            const r_offset = {
                value : Number(this.elfFile.getBigUint64(relocation_section_offset, this.is_lsb)),
                raw_dec : this.elfFile.getBigUint64(relocation_section_offset, this.is_lsb).toString(),
                raw_hex : this.elfFile.getBigUint64(relocation_section_offset, this.is_lsb).toString(16),
                size_bytes : this.data_types.Elf_Addr,
                offset : relocation_section_offset,
                name : "r_offset"
            };
            relocation_section_offset += this.data_types.Elf_Addr; 

            relocation_entry.section_content = {
                r_offset : r_offset
            }

            // SHT_RELR is a relocation entry without explicit addend or info (relative relocations only).
            // this means that SHT_RELR will only contain an offset.
            // SHT_REL and SHT_RELA will contain an info and SHT_RELA will contain an addend additionally
            // Therefore, r_info and r_added will only apply to these
            if (reloc.sh_type == "SHT_REL" || reloc.sh_type == "SHT_RELA") {

                // This member gives both the symbol table index with respect to which the relocation must be made and the type of relocation to apply.  
                // Relocation types are processor-specific.
                // When the text refers to a relocation entry's relocation type or symbol table index, it means the result of applying ELF[32|64]_R_TYPE or ELF[32|64]_R_SYM, respectively, to the entry's r_info member.
                const r_info = {
                    value : Number(this.elfFile.getBigUint64(relocation_section_offset, this.is_lsb)),
                    raw_dec : this.elfFile.getBigUint64(relocation_section_offset, this.is_lsb).toString(),
                    raw_hex : this.elfFile.getBigUint64(relocation_section_offset, this.is_lsb).toString(16),
                    size_bytes : this.data_types.Elf_Addr,
                    offset : relocation_section_offset,
                    name : "r_info"
                };
                relocation_section_offset += this.data_types.Elf_Addr;

                relocation_entry.section_content.r_info = r_info;

                // get actual relocation type from r_info
                relocation_entry.section_content.r_type = this.getRelocType(r_info);

                // get actual symbol from r_info
                // The sh_link field in the section header specifies the symbol table associated with the section. 
                // For example, in a .rela.text section, the sh_link field will contain the index of the symbol table to be used for that specific section. 
                // It's this index that decides whether to use .symtab or .dynsym.
                relocation_entry.section_content.r_sym = this.getRelocSymbol(r_info, this.elf_contents.elf_shdr[reloc.section_header.sh_link.value]);


                // SHT_RELA contains an addend additionally
                if (reloc.sh_type == "SHT_RELA") {

                    // This member specifies a constant addend used to compute the value to be stored into the relocatable field.
                    const r_addend = {
                        value : Number(this.elfFile.getBigInt64(relocation_section_offset, this.is_lsb)),
                        raw_dec : this.elfFile.getBigInt64(relocation_section_offset, this.is_lsb).toString(),
                        raw_hex : this.elfFile.getBigInt64(relocation_section_offset, this.is_lsb).toString(16),
                        size_bytes : this.data_types.Elf_Sxword,
                        offset : relocation_section_offset,
                        name : "r_addend"
                    };
                    relocation_section_offset += this.data_types.Elf_Sxword;

                    relocation_entry.section_content.r_addend = r_addend;
                }
            }
            
            relocation_entries.push(relocation_entry);
        }
    }

    return relocation_entries;

}



ELF.prototype.processElfDynSymtab32 = function(){
    
}

ELF.prototype.processElfDynSymtab64 = function(){
    return this.processElfSymbolTables("SHT_DYNSYM");
}

ELF.prototype.processElfSymtab32 = function(){
    
}

ELF.prototype.processElfSymtab64 = function(){
    return this.processElfSymbolTables("SHT_SYMTAB");
    
}

ELF.prototype.processElfSymbolTables = function(symbol_table_type) {
    
    let symtab = null;
    let strtab_offset = 0; // strtab used for symtab st_name
    
    // get symtab from elf section header
    // to my knowledge, there no other way but to check for 
    // sh_type SHT_SYMTAB to get symbol table 
    // for the dynamic symbols, you could also check the dynamic section
    // for DT_SYMTAB
    for(const element of this.elf_contents.elf_shdr){
        if(element.sh_type.value == symbol_table_type){
            symtab = element;
            strtab_offset = this.elf_contents.elf_shdr[symtab.sh_link.value].sh_offset.value;
            
        }
    }
    
    // Handle if no symtab section present (e.g. if not compiled with -g flag in gcc)
    if(symtab == null){
        return null;
    }
    
    // check if sh_size is 0 or sh_size is greater than entire file size, if yes, abort
    if(symtab.sh_size.value == 0 || symtab.sh_size.value > this.file_length){
        const err = new Error("symbol table section size error: " + symtab.sh_size.value);
        return err;
    }
    
    // check if sh_entsize is 0 or if sh_entsize is greater than sh_size.value, if yes, abort
    if(symtab.sh_entsize.value == 0 || symtab.sh_entsize.value > symtab.sh_size.value){
        const err = new Error("symbol table section table member size error: " + symtab.sh_entsize.value);
        return err;
    }
    
    // get number of entries in symtable
    let symtab_entries_number = symtab.sh_size.value / symtab.sh_entsize.value;
    
    let symtab_entries = [];

    for(let symtab_entry_count = 0; symtab_entry_count < symtab_entries_number; symtab_entry_count++){
        
        // calculate offset
        let symtab_offset = symtab.sh_offset.value + (symtab_entry_count * symtab.sh_entsize.value);
        
        /*
        This  member holds an index into the object file's symbol string table, which holds 
        character representations of the symbol names. If the value is nonzero, it represents a 
        string table index that gives the symbol name. Otherwise, the symbol has no name.
        */
        const st_name_offset = this.elfFile.getUint32(symtab_offset, this.is_lsb);
        const st_name = {
            value : this.getStringFromStringTable(strtab_offset + st_name_offset),
            raw_dec : st_name_offset.toString(),
            raw_hex : st_name_offset.toString(16),
            size_bytes : this.data_types.Elf_Word,
            offset : symtab_offset,
            name : "st_name"
        };
        symtab_offset += this.data_types.Elf_Word;
        
        /*
        This member specifies the symbol's type and binding attributes.
        Its made up of 8 bits, the first four bits represent the type (T) 
        and the last four bits represent the binding (B):
        
        
        bit value | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 | 
        {B,T}     | B   | B  | B  | B  | T | T | T | T |
        Operation |         >> 4       |       &0xF    |
        
        Thus, we do some bit shifting and bitwise operation to get the 
        type and the binding
        */
        
        const st_bind = {
            value :  elf_sym.st_bind[this.elfFile.getUint8(symtab_offset, this.is_lsb) >> 4],
            raw_dec : (this.elfFile.getUint8(symtab_offset, this.is_lsb) >> 4).toString(),
            raw_hex : (this.elfFile.getUint8(symtab_offset, this.is_lsb) >> 4).toString(16),
            size_bytes : this.data_types.char,
            offset : symtab_offset,
            name : "st_bind"
        };
        const st_type = {
            value :  elf_sym.st_type[this.elfFile.getUint8(symtab_offset, this.is_lsb) & 0xF],
            raw_dec : (this.elfFile.getUint8(symtab_offset, this.is_lsb) & 0xF).toString(),
            raw_hex : (this.elfFile.getUint8(symtab_offset, this.is_lsb) & 0xF).toString(16),
            size_bytes : this.data_types.char,
            offset : symtab_offset,
            name : "st_type"
        };
        symtab_offset += this.data_types.char;
        
        /* 
        This member defines the symbol visibility.
        This controls how a symbol may be accessed once it has
        become part of an executable or shared library.
        
        Its made up of 8 bits but only the first two represent (4 combinations) the visibility (V), thus
        bit value | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 | 
        {V}       | -   | -  | -  | -  | - | - | V | V |
        Operation |            -               |  &0x3 |
        
        */
        const st_other = {
            value :  elf_sym.st_other[this.elfFile.getUint8(symtab_offset, this.is_lsb) & 0x3],
            raw_dec : (this.elfFile.getUint8(symtab_offset, this.is_lsb) & 0x3).toString(),
            raw_hex : (this.elfFile.getUint8(symtab_offset, this.is_lsb) & 0x3).toString(16),
            size_bytes : this.data_types.char,
            offset : symtab_offset,
            name : "st_other"
        };
        symtab_offset += this.data_types.char;
        
        /*
        Every symbol table entry is "defined" in relation to some section.  
        This member holds the relevant section header table index.
        */
        const st_shndx = {
            value :  this.elfFile.getUint16(symtab_offset, this.is_lsb),
            raw_dec : this.elfFile.getUint16(symtab_offset, this.is_lsb).toString(),
            raw_hex : this.elfFile.getUint16(symtab_offset, this.is_lsb).toString(16),
            size_bytes : this.data_types.Elf_Half,
            offset : symtab_offset,
            name : "st_shndx"
        };
        symtab_offset += this.data_types.Elf_Half;
        
        
        /*
        This member gives the value of the associated symbol.
        This actually points to the address of that symbol if the
        st_type is of FUNC
        */
        const st_value = {
            value :  Number(this.elfFile.getBigUint64(symtab_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(symtab_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(symtab_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Addr,
            offset : symtab_offset,
            name : "st_value"
        };
        symtab_offset += this.data_types.Elf_Addr;
        
        /*
        Many symbols have associated sizes. This member holds zero if the symbol has no size or an unknown size.
        */
        const st_size = {
            value :  Number(this.elfFile.getBigUint64(symtab_offset, this.is_lsb)),
            raw_dec : Number(this.elfFile.getBigUint64(symtab_offset, this.is_lsb)).toString(),
            raw_hex : Number(this.elfFile.getBigUint64(symtab_offset, this.is_lsb)).toString(16),
            size_bytes : this.data_types.Elf_Xword,
            offset : symtab_offset,
            name : "st_size"
        };
        symtab_offset += this.data_types.Elf_Xword;
        
        let symtab_entry = {
            st_name : st_name,
            st_bind : st_bind,
            st_type : st_type,
            st_other : st_other,
            st_shndx : st_shndx,
            st_value : st_value,
            st_size : st_size
        }
        
        symtab_entries.push(symtab_entry);
        
    }
    
    return symtab_entries;
}

/* These functions disassemble and assemble a symbol table st_info field,
which contains the symbol binding and symbol type.  The STB_ and STT_
defines identify the binding and type.  */

ELF.prototype.processByClass = function(functionPrefix) {
    
    const processorSuffix = this.e_ident.EI_CLASS.value == "ELFCLASS64" ? "64" : "32";
    const processorName = `${functionPrefix}${processorSuffix}`;
    
    const processor = this[processorName];
    
    if (processor && typeof processor === 'function') {
        return processor.call(this);
    } else {
        const err = new Error(`Unsupported processor for EI_CLASS '${this.e_ident.EI_CLASS.value}' and prefix '${functionPrefix}'`)
        throw err;
    }
};

ELF.prototype.processElfHdr = function() {
    return this.processByClass("processElfHdr");
};

ELF.prototype.processElfPhdr = function() {
    return this.processByClass("processElfPhdr");
};

ELF.prototype.processElfShdr = function() {
    return this.processByClass("processElfShdr");
};

ELF.prototype.processElfDyn = function() {
    return this.processByClass("processElfDyn");
};

ELF.prototype.processElfSymtab = function() {
    return this.processByClass("processElfSymtab");
};

ELF.prototype.processElfDynSymtab = function() {
    return this.processByClass("processElfDynSymtab");
};

ELF.prototype.processElfRelocation = function() {
    return this.processByClass("processElfRelocation");
};



ELF.prototype.getFlagName = function(bitmask, currentFlag, flags) {
    return (bitmask & currentFlag) !== 0 ? flags[currentFlag] : null;
}

ELF.prototype.getSetFlags = function(bitmask, flags) {
    const setFlags = [];
    for (const currentFlag in flags) {
        const flagName = this.getFlagName(bitmask, currentFlag, flags);
        if (flagName) {
            setFlags.push(flagName);
        }
    }
    return setFlags;
}


ELF.prototype.run = function(file){
    
    this.file_name = file.name;
    this.file_last_modified = file.lastModified;

    return this.loadFile(file).then((arrayBuffer) => {
        this.parseELF(arrayBuffer);
        return this;
    });
}


