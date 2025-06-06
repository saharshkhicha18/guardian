import CommonElements from "../../../support/defaultUIElements";
import * as Checks from "../../../support/checkingMethods";

const ConfigPageLocators = {
	generateButton: "Generate",
	nextButton: "Next",
	connectButton: "Connect",
	hederaIDInput: '[ng-reflect-name="hederaAccountId"]',
	hederaKeyInput: '[ng-reflect-name="hederaAccountKey"]',
	hederaIDUserInput: '[ng-reflect-name="id"]',
	hederaKeyUserInput: '[ng-reflect-name="key"]',
	did: 'did:hedera:testnet',
	submitButton: 'Submit',
	userNameInMenu: "span[ng-reflect-content='Open Profile']",
	organizationNameLabel: " OrganizationName ",
	websiteLabel: " Website ",
	tagsLabel: " Tags ",
	userLabelForReg: " test field ",
	PasswordChangeButton: "div[class='view-document-button']",

	// usernameInput: '[ng-reflect-name="username"]',
	// geographyInput: '[ng-reflect-name="geography"]',
	// lawInput: '[ng-reflect-name="law"]',
	// tagsInput: '[ng-reflect-name="tags"]',
	// isicInput: '[ng-reflect-name="ISIC"]',
	// connectBtn: "Connect",
	// standardregistryList: 'api/v1/schemas/system/entity/STANDARD_REGISTRY',
	// taskReq: '/api/v1/tasks/**',
	// userProfileApi: '/api/v1/profiles/',
	// selectadminLst: '[role="combobox"]',
	// adminList: '.mat-option-text',
	// adminInfoList: 'div.user-info-container > div.item > span',
	// creatingKeyLabel: "Create random key...",
}

export class ConfigPage {

	verifyUserCreated(username) {
		cy.get(ConfigPageLocators.userNameInMenu).should('have.text', username);
	}

	hederaSRRegistration(hederaId = "random", hederaKey) {
		if (hederaId == "random") {
			cy.contains(ConfigPageLocators.generateButton).click();
			Checks.waitForElement(ConfigPageLocators.hederaIDInput);
		}
		else {
			cy.get(ConfigPageLocators.hederaIDInput).type(hederaId);
			cy.get(ConfigPageLocators.hederaKeyInput).type(hederaKey);
		}
		cy.contains(ConfigPageLocators.nextButton).click();
		cy.contains(ConfigPageLocators.nextButton).click();
		cy.contains(ConfigPageLocators.organizationNameLabel).parent().find(CommonElements.Input).type("A");
		cy.contains(ConfigPageLocators.tagsLabel).parent().find(CommonElements.Input).type("B");
		cy.contains(ConfigPageLocators.websiteLabel).parent().find(CommonElements.Input).type("C");
		cy.contains(ConfigPageLocators.connectButton).click();
		Checks.waitForElement(ConfigPageLocators.PasswordChangeButton, 75, 5000);
		cy.contains(ConfigPageLocators.did).should('not.be.null');
	}

	hederaUserRegistration(SRNameToLink, hederaId = "random", hederaKey) {
		cy.contains(SRNameToLink).click();
		cy.contains(ConfigPageLocators.nextButton).click();
		if (hederaId == "random") {
			cy.contains(ConfigPageLocators.generateButton).click();
			Checks.waitForElement(ConfigPageLocators.hederaIDUserInput);
		}
		else {
			cy.get(ConfigPageLocators.hederaIDUserInput).type(hederaId);
			cy.get(ConfigPageLocators.hederaKeyUserInput).type(hederaKey);
		}
		cy.contains(ConfigPageLocators.nextButton).click();
		cy.contains(ConfigPageLocators.submitButton).click();
		Checks.waitForElement(ConfigPageLocators.PasswordChangeButton, 75, 5000);
		cy.contains(ConfigPageLocators.did).should('not.be.null');
	}

	static waitForTask(task) {
		// cy.intercept(ConfigPageLocators.taskReq).as(
		// 	"waitFor" + task + "ToComplete"
		// );
		// cy.wait("@waitFor" + task + "ToComplete", { timeout: 100000 })
	}


	finishsetupSD(Option, ID, KEY) {
		// if (Option == 'GENERATE') {
		// 	cy.contains(ConfigPageLocators.generateButton).click();
		// 	ConfigPage.waitForTask("SetupSD");
		// 	cy.wait(4000);
		// 	cy.get(ConfigPageLocators.hederaIDInput).should('not.be.null')
		// 	cy.get(ConfigPageLocators.hederaKeyInput).should('not.be.null')
		// 	cy.get(ConfigPageLocators.hederaIDInput).invoke('val').then(text => {
		// 		const ID = text;
		// 		cy.log(ID);
		// 	});
		// 	cy.get(ConfigPageLocators.hederaKeyInput).invoke('val').then(text => {
		// 		const KEY = text;
		// 		cy.log(KEY);
		// 	});
		// }
		// if (Option == 'NOGENERATE') {
		// 	cy.wait(2000);
		// 	cy.get(ConfigPageLocators.hederaIDInput).type(ID);
		// 	cy.get(ConfigPageLocators.hederaKeyInput).type(KEY);
		// 	cy.contains(ConfigPageLocators.nextBtn).should('be.enabled');
		// }

		// cy.contains(ConfigPageLocators.nextBtn).click();

		// cy.get(ConfigPageLocators.geographyInput).type("test");
		// cy.get(ConfigPageLocators.lawInput).type("law");
		// cy.get(ConfigPageLocators.tagsInput).type("tag");
		// cy.get(ConfigPageLocators.isicInput).type("version1");
		// cy.contains(ConfigPageLocators.connectBtn).click();
		// cy.intercept(ConfigPageLocators.standardregistryList).as('waitForSetup')
		// cy.wait('@waitForSetup', { timeout: 200000 });
		// cy.contains(ConfigPageLocators.did).should('not.be.null')
	}

	finishsetupUser(admin, username, Option, ID, KEY) {
		// cy.get('.standard-registry').find('span').contains(admin).click();
		// cy.contains('Next').click();
		// cy.wait(2000);
		// if (Option == 'GENERATE') {
		// 	cy.contains(ConfigPageLocators.generateButton).click();
		// 	ConfigPage.waitForTask("SetupUser");
		// 	cy.wait(4000);
		// }
		// if (Option == 'NOGENERATE') {
		// 	cy.get(ConfigPageLocators.hederaIDUserInput).type(ID);
		// 	cy.get(ConfigPageLocators.hederaKeyUserInput).type(KEY);
		// 	cy.contains(ConfigPageLocators.submitBtn).should('be.enabled');
		// }
		// cy.wait(3000);
		// cy.contains(ConfigPageLocators.submitBtn).click()
		// cy.intercept(ConfigPageLocators.userProfileApi + username).as('waitForuser')
		// cy.wait('@waitForuser', { timeout: 200000 })
	}

	verifyHeaderLabelsOnLoginPageForAdmin() {
		// cy.wait(2000);
		// cy.get(ConfigPageLocators.adminInfoList).should(($header) => {
		// 	expect($header.get(0).innerText).to.eq('DID Document')
		// 	expect($header.get(1).innerText).to.eq('VC Document')
		// 	expect($header.get(2).innerText).to.eq('Balance')
		// 	expect($header.get(4).innerText).to.eq('Hedera Account ID')
		// 	expect($header.get(5).innerText).to.eq('DID')
		// 	expect($header.get(7).innerText).to.eq('User Topic')
		// 	expect($header.get(8).innerText).to.eq('Initialization Topic')
		// })
		// cy.wait(3000);
	}

	verifyHeaderLabelsOnLoginPageForUser() {
		// 	cy.wait(2000);
		// 	cy.get(ConfigPageLocators.adminInfoList).should(($header) => {
		// 		expect($header.get(0).innerText).to.eq('HEDERA ID')
		// 		expect($header.get(1).innerText).to.eq('BALANCE')
		// 		expect($header.get(3).innerText).to.eq('USER TOPIC')
		// 		expect($header.get(4).innerText).to.eq('Standard Registry')
		// 		expect($header.get(6).innerText).to.eq('DID')
		// 		expect($header.get(8).innerText).to.eq('DID Document')
		// 	})
		// 	cy.wait(3000);
	}
}
