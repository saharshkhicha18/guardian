import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: ['schema', 'thirdPool'] }, () => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Schemas,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            let schemaId = response.body[0].id;

            cy.request({
                method: METHOD.GET,
                url:
                API.ApiServer +
                    API.Schemas +
                    schemaId +
                    "/export/file",
                encoding: null,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.not.be.oneOf([null, ""]);
                let schema = Cypress.Blob.arrayBufferToBinaryString(
                    response.body
                );
                cy.writeFile(
                    "cypress/fixtures/exportedSchema.schema",
                    schema,
                    "binary"
                );
            });
        });
    });

    it("Preview the schema from a file", () => {
        cy.fixture("exportedSchema.schema", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url:
                        API.ApiServer + API.SchemaImportFilePreview,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            });
    });
});
