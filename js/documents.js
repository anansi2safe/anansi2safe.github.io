function getDocName(){
    let docName = "";
    let key = "id";
    let reg = new RegExp("(^|&)" + key + "=([^&]*)(&|$)");
    let r = window.location.search.substr(1).match(reg);
    docName_t = decodeURI(r[2]);
    docName = docName_t.split('\'')[1];
    return docName;
}

function PageInit(){
    let filename = getDocName();
    $("#top").html(filename.split(".")[0]);
    $("title").html(filename.split(".")[0]);
    let uri = "./archive/"+filename;
    $.ajax({
        url: uri, 
        async: true, 
        success: function(res){
            // 替换<meta>与<title>标签
            let reg1 = /<title(?:(?!<\/p>).|\n)*?<\/title>/gm;
            let reg2 = /<meta(?:(?!\/>).|\n)*?>/gm;
            let reg3 = /<body(?:(?!\/>).|\n)*?>/gm;
            let ht = res
                .replace(reg1, "")
                .replace(reg2, "")
                .replace("<html>", "")
                .replace("</html>", "")
                .replace("<html>", "")
                .replace("<head>", "")
                .replace("</head>", "")
                .replace(reg3, "")
                .replace("</body>", "")
                .replace("<!DOCTYPE html>", "");
            console.log(ht);
            console.log("==========================");
            console.log(res);
            $("#doc").html(ht);
        }});
}

